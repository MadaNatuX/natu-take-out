package fun.cyhgraph.service.serviceImpl;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import fun.cyhgraph.constant.MessageConstant;
import fun.cyhgraph.context.BaseContext;
import fun.cyhgraph.dto.OrderCancelDTO;
import fun.cyhgraph.dto.OrderConfirmDTO;
import fun.cyhgraph.dto.OrderPageDTO;
import fun.cyhgraph.dto.OrderPaymentDTO;
import fun.cyhgraph.dto.OrderRejectionDTO;
import fun.cyhgraph.dto.OrderSubmitDTO;
import fun.cyhgraph.entity.AddressBook;
import fun.cyhgraph.entity.Cart;
import fun.cyhgraph.entity.Order;
import fun.cyhgraph.entity.OrderDetail;
import fun.cyhgraph.entity.User;
import fun.cyhgraph.exception.AddressBookBusinessException;
import fun.cyhgraph.exception.OrderBusinessException;
import fun.cyhgraph.exception.ShoppingCartBusinessException;
import fun.cyhgraph.mapper.AddressBookMapper;
import fun.cyhgraph.mapper.CartMapper;
import fun.cyhgraph.mapper.OrderDetailMapper;
import fun.cyhgraph.mapper.OrderMapper;
import fun.cyhgraph.mapper.UserMapper;
import fun.cyhgraph.result.PageResult;
import fun.cyhgraph.service.OrderService;
import fun.cyhgraph.utils.HttpClientUtil;
import fun.cyhgraph.vo.OrderPaymentVO;
import fun.cyhgraph.vo.OrderStatisticsVO;
import fun.cyhgraph.vo.OrderSubmitVO;
import fun.cyhgraph.vo.OrderVO;
import fun.cyhgraph.websocket.WebSocketServer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
public class OrderServiceImpl implements OrderService {

    /*
     * 核心依赖：
     * 这一组 Mapper 和组件负责把“下单 -> 支付 -> 状态流转 -> 通知商家”的完整链路串起来。
     * 本次改造里最关键的是 orderMapper、addressBookMapper 和 webSocketServer。
     */
    @Autowired
    private OrderMapper orderMapper;
    @Autowired
    private OrderDetailMapper orderDetailMapper;
    @Autowired
    private CartMapper cartMapper;
    @Autowired
    private AddressBookMapper addressBookMapper;
    @Autowired
    private UserMapper userMapper;
    @Autowired
    private WebSocketServer webSocketServer;
    @Value("${hanye.shop.address}")
    private String shopAddress;
    @Value("${hanye.baidu.ak}")
    private String ak;

    /**
     * 用户下单主流程
     *
     * 这里统一接住外卖单和堂食单：
     * 1. 先校验购物车是否为空
     * 2. 再根据 orderType 构建不同类型的订单主体
     * 3. 写入订单主表和订单明细
     * 4. 最后清空购物车并返回订单基础信息
     */
    @Override
    @Transactional
    public OrderSubmitVO submit(OrderSubmitDTO orderSubmitDTO) {
        Integer userId = BaseContext.getCurrentId();
        List<Cart> cartList = getCartList(userId);
        Integer orderType = normalizeOrderType(orderSubmitDTO.getOrderType());
        
        Order order = buildOrder(orderSubmitDTO, userId, orderType);
        orderMapper.insert(order);

        List<OrderDetail> orderDetailList = buildOrderDetails(cartList, order.getId());
        orderDetailMapper.insertBatch(orderDetailList);
        cartMapper.delete(userId);

        return OrderSubmitVO.builder()
                .id(order.getId())
                .orderNumber(order.getNumber())
                .orderAmount(order.getAmount())
                .orderTime(order.getOrderTime())
                .build();
    }

    /**
     * 当前用户未支付订单数量
     *
     * 这个接口不区分堂食/外卖，仍然保持“当前用户所有待支付订单”的统计语义。
     */
    @Override
    public Integer unPayOrderCount() {
        return orderMapper.getUnPayCount(BaseContext.getCurrentId());
    }

    /**
     * 根据 id 查询订单详情
     *
     * OrderVO 继承了 Order，因此这里会自然把 orderType、inNumber 一并返回给前端。
     */
    @Override
    public OrderVO getById(Integer id) {
        Order order = getOrderOrThrow(id);
        List<OrderDetail> orderDetailList = orderDetailMapper.getById(id);
        OrderVO orderVO = new OrderVO();
        BeanUtils.copyProperties(order, orderVO);
        orderVO.setOrderDetailList(orderDetailList);
        return orderVO;
    }

    /**
     * 用户端条件分页查询历史订单
     *
     * 前端可以通过 orderType 指定查询堂食或外卖；
     * 如果前端暂时没传，normalizeOrderType 会默认按外卖处理，保证旧页面不受影响。
     */
    @Override
    public PageResult userPage(int page, int pageSize, Integer status, Integer orderType) {
        PageHelper.startPage(page, pageSize);
        OrderPageDTO orderPageDTO = new OrderPageDTO();
        orderPageDTO.setUserId(BaseContext.getCurrentId());
        orderPageDTO.setStatus(status);
        orderPageDTO.setOrderType(normalizeOrderType(orderType));
        Page<Order> orderPage = orderMapper.page(orderPageDTO);

        List<OrderVO> list = new ArrayList<>();
        if (orderPage != null && orderPage.getTotal() > 0) {
            for (Order order : orderPage) {
                List<OrderDetail> orderDetails = orderDetailMapper.getById(order.getId());
                OrderVO orderVO = new OrderVO();
                BeanUtils.copyProperties(order, orderVO);
                orderVO.setOrderDetailList(orderDetails);
                list.add(orderVO);
            }
        }
        return new PageResult(orderPage.getTotal(), list);
    }

    /**
     * 用户取消订单
     *
     * 这里延续原有规则：只有低状态订单允许用户直接取消。
     * 因为堂食单支付后直接到 4，所以堂食已支付订单默认不会走到这里的成功分支。
     */
    @Override
    public void userCancelById(Integer id) throws Exception {
        Order orderDB = getOrderOrThrow(id);
        if (orderDB.getStatus() > Order.TO_BE_CONFIRMED) {
            throw new OrderBusinessException(MessageConstant.ORDER_STATUS_ERROR);
        }

        Order order = new Order();
        order.setId(orderDB.getId());
        if (Order.TO_BE_CONFIRMED.equals(orderDB.getStatus())) {
            order.setPayStatus(Order.REFUND);
        }
        order.setStatus(Order.CANCELLED);
        order.setCancelReason("用户取消");
        order.setCancelTime(LocalDateTime.now());
        orderMapper.update(order);
    }

    /**
     * 再来一单
     *
     * 该能力和订单类型无关，本质上是把历史订单详情重新拷贝回购物车。
     */
    @Override
    public void reOrder(Integer id) {
        Integer userId = BaseContext.getCurrentId();
        List<OrderDetail> detailList = orderDetailMapper.getById(id);
        List<Cart> cartList = detailList.stream().map(x -> {
            Cart cart = new Cart();
            BeanUtils.copyProperties(x, cart, "id");
            cart.setUserId(userId);
            cart.setCreateTime(LocalDateTime.now());
            return cart;
        }).toList();
        cartMapper.insertBatch(cartList);
    }

    /**
     * 用户支付订单
     *
     * 这里是这次改造的核心分流点：
     * 外卖支付后进入 2 待接单，堂食支付后直接进入 4。
     * 同时，这里改成了“按订单号查单”而不是依赖 service 成员变量，避免并发串单。
     */
    @Override
    public OrderPaymentVO payment(OrderPaymentDTO orderPaymentDTO) {
        Integer userId = BaseContext.getCurrentId();
        Order order = orderMapper.getByNumber(orderPaymentDTO.getOrderNumber());
        if (order == null || !userId.equals(order.getUserId())) {
            throw new OrderBusinessException(MessageConstant.ORDER_NOT_FOUND);
        }

        JSONObject jsonObject = new JSONObject();
        jsonObject.put("code", "ORDERPAID");
        OrderPaymentVO vo = jsonObject.toJavaObject(OrderPaymentVO.class);
        vo.setPackageStr(jsonObject.getString("package"));

        Integer orderStatus = isTakeoutOrder(order) ? Order.TO_BE_CONFIRMED : Order.DELIVERY_IN_PROGRESS;
        orderMapper.updateStatus(orderStatus, Order.PAID, LocalDateTime.now(), order.getId());
        notifyAdminNewOrder(order);
        return vo;
    }

    /**
     * 管理端条件分页查询订单信息
     *
     * 和用户端一样支持 orderType 过滤；
     * 这样后续前端可以通过在不同页面写死 orderType，复用同一套接口。
     */
    @Override
    public PageResult conditionSearch(OrderPageDTO orderPageDTO) {
        orderPageDTO.setOrderType(normalizeOrderType(orderPageDTO.getOrderType()));
        PageHelper.startPage(orderPageDTO.getPage(), orderPageDTO.getPageSize());
        Page<Order> orders = orderMapper.page(orderPageDTO);
        List<OrderVO> orderVOList = getOrderVOList(orders);
        return new PageResult(orders.getTotal(), orderVOList);
    }

    /**
     * 订单状态统计
     *
     * 统计口径跟随 orderType 走，默认仍按外卖统计，保证现有订单管理页的表现不变。
     */
    @Override
    public OrderStatisticsVO statistics(Integer orderType) {
        Integer queryOrderType = normalizeOrderType(orderType);
        Integer toBeConfirmed = orderMapper.countByStatus(Order.TO_BE_CONFIRMED, queryOrderType);
        Integer confirmed = orderMapper.countByStatus(Order.CONFIRMED, queryOrderType);
        Integer deliveryInProgress = orderMapper.countByStatus(Order.DELIVERY_IN_PROGRESS, queryOrderType);
        return OrderStatisticsVO.builder()
                .toBeConfirmed(toBeConfirmed)
                .confirmed(confirmed)
                .deliveryInProgress(deliveryInProgress)
                .build();
    }

    /**
     * 接单
     *
     * 这里只允许外卖单从 2 -> 3。
     * 堂食单即使调用到这里，也会被 validateTakeoutStatus 拦下来。
     */
    @Override
    public void confirm(OrderConfirmDTO orderConfirmDTO) {
        Order orderDB = getOrderOrThrow(orderConfirmDTO.getId());
        validateTakeoutStatus(orderDB, Order.TO_BE_CONFIRMED);
        Order order = Order.builder()
                .id(orderConfirmDTO.getId())
                .status(Order.CONFIRMED)
                .build();
        orderMapper.update(order);
    }

    /**
     * 拒单
     *
     * 仍然只允许外卖待接单执行拒单，拒单后统一走取消 + 退款状态。
     */
    @Override
    public void reject(OrderRejectionDTO orderRejectionDTO) {
        Order orderDB = getOrderOrThrow(orderRejectionDTO.getId());
        validateTakeoutStatus(orderDB, Order.TO_BE_CONFIRMED);

        Order order = new Order();
        order.setId(orderDB.getId());
        order.setPayStatus(Order.REFUND);
        order.setStatus(Order.CANCELLED);
        order.setRejectionReason(orderRejectionDTO.getRejectionReason());
        order.setCancelTime(LocalDateTime.now());
        orderMapper.update(order);
    }

    /**
     * 后台取消订单
     *
     * 后台取消不区分堂食/外卖，统一按退款取消处理。
     */
    @Override
    public void cancel(OrderCancelDTO orderCancelDTO) {
        Order orderDB = getOrderOrThrow(orderCancelDTO.getId());
        Order order = new Order();
        order.setId(orderDB.getId());
        order.setPayStatus(Order.REFUND);
        order.setStatus(Order.CANCELLED);
        order.setCancelReason(orderCancelDTO.getCancelReason());
        order.setCancelTime(LocalDateTime.now());
        orderMapper.update(order);
    }

    /**
     * 外卖派送
     *
     * 这里只处理外卖 3 -> 4，堂食单不允许走派送节点。
     */
    @Override
    public void delivery(Integer id) {
        Order orderDB = getOrderOrThrow(id);
        validateTakeoutStatus(orderDB, Order.CONFIRMED);
        Order order = new Order();
        order.setId(orderDB.getId());
        order.setStatus(Order.DELIVERY_IN_PROGRESS);
        orderMapper.update(order);
    }

    /**
     * 完成订单
     *
     * 两种订单最终都从 4 -> 5，因此这里只校验当前状态是否是 4。
     */
    @Override
    public void complete(Integer id) {
        Order orderDB = getOrderOrThrow(id);
        if (!Order.DELIVERY_IN_PROGRESS.equals(orderDB.getStatus())) {
            throw new OrderBusinessException(MessageConstant.ORDER_STATUS_ERROR);
        }
        Order order = new Order();
        order.setId(orderDB.getId());
        order.setStatus(Order.COMPLETED);
        order.setDeliveryTime(LocalDateTime.now());
        orderMapper.update(order);
    }

    /**
     * 用户催单
     *
     * 催单本质是一次 websocket 提醒，和单型无关。
     */
    @Override
    public void reminder(Integer id) {
        Order orderDB = getOrderOrThrow(id);
        Map<String, Object> map = new HashMap<>();
        map.put("type", 2);
        map.put("orderId", id);
        map.put("content", "订单号：" + orderDB.getNumber());
        String json = JSON.toJSONString(map);
        log.info("发给商家端啊！：{}", map);
        webSocketServer.sendToAllClient(json);
    }

    /*
     * 订单构建分支：
     * 这里把“同一个 submit 接口里如何区分外卖/堂食”集中封装，
     * 这样主流程里只保留骨架，具体填充规则都落在这里。
     */
    private Order buildOrder(OrderSubmitDTO orderSubmitDTO, Integer userId, Integer orderType) {
        Order order = new Order();
        BeanUtils.copyProperties(orderSubmitDTO, order);
        order.setOrderType(orderType);
        order.setUserId(userId);
        order.setNumber(String.valueOf(System.currentTimeMillis()));
        order.setStatus(Order.PENDING_PAYMENT);
        order.setPayStatus(Order.UN_PAID);
        order.setOrderTime(LocalDateTime.now());

        User user = userMapper.getById(userId);
        if (user != null) {
            order.setUserName(user.getName());
        }

        if (Order.ORDER_TYPE_TAKEOUT.equals(orderType)) {
            // 外卖单需要完整收货信息，地址簿也是外卖下单的必校验项。
            fillTakeoutOrderInfo(order, orderSubmitDTO.getAddressId());
            order.setInNumber(null);
        } else if (Order.ORDER_TYPE_DINE_IN.equals(orderType)) {
            // 堂食单不需要配送信息，因此这里显式清空相关字段，避免脏数据串入。
            order.setAddressBookId(null);
            order.setPhone(null);
            order.setAddress(null);
            order.setConsignee(null);
            order.setEstimatedDeliveryTime(null);
            order.setDeliveryStatus(null);
            order.setInNumber(generateDineInOrderNumber());
        } else {
            throw new OrderBusinessException(MessageConstant.ORDER_TYPE_ERROR);
        }
        return order;
    }

    /*
     * 外卖订单专属数据填充：
     * 从地址簿中回填手机号、地址、收件人。
     */
    private void fillTakeoutOrderInfo(Order order, Integer addressId) {
        AddressBook addressBook = addressBookMapper.getById(addressId);
        if (addressBook == null) {
            throw new AddressBookBusinessException(MessageConstant.ADDRESS_BOOK_IS_NULL);
        }
        // checkOutOfRange(addressBook.getCityName() + addressBook.getDistrictName() +
        // addressBook.getDetail());
        order.setAddressBookId(addressId);
        order.setPhone(addressBook.getPhone());
        order.setAddress(addressBook.getDetail());
        order.setConsignee(addressBook.getConsignee());
    }

    /*
     * 购物车校验与提取：
     * 下单前必须先拿到当前用户购物车数据，否则后续没有办法生成订单明细。
     */
    private List<Cart> getCartList(Integer userId) {
        Cart cart = new Cart();
        cart.setUserId(userId);
        List<Cart> cartList = cartMapper.list(cart);
        if (CollectionUtils.isEmpty(cartList)) {
            throw new ShoppingCartBusinessException(MessageConstant.CART_IS_NULL);
        }
        return cartList;
    }

    /*
     * 订单明细构建：
     * 把购物车条目逐条复制到 order_detail，形成订单快照。
     */
    private List<OrderDetail> buildOrderDetails(List<Cart> cartList, Integer orderId) {
        List<OrderDetail> orderDetailList = new ArrayList<>();
        for (Cart cart : cartList) {
            OrderDetail orderDetail = new OrderDetail();
            BeanUtils.copyProperties(cart, orderDetail);
            orderDetail.setOrderId(orderId);
            orderDetailList.add(orderDetail);
        }
        return orderDetailList;
    }

    /*
     * 支付成功后的商家通知：
     * 这里统一发送“来单提醒”，无论是外卖还是堂食，商家端都能收到。
     */
    private void notifyAdminNewOrder(Order order) {
        Map<String, Object> map = new HashMap<>();
        map.put("type", 1);
        map.put("orderId", order.getId());
        map.put("content", "订单号：" + order.getNumber());
        String json = JSON.toJSONString(map);
        log.info("发给商家端啊！：{}", map);
        webSocketServer.sendToAllClient(json);
    }

    /*
     * 订单类型归一化：
     * 当前为了兼容旧前端，凡是没传 orderType 的地方都默认按外卖处理。
     */
    private Integer normalizeOrderType(Integer orderType) {
        if (orderType == null) {
            return Order.ORDER_TYPE_TAKEOUT;
        }
        if (!Order.ORDER_TYPE_TAKEOUT.equals(orderType) && !Order.ORDER_TYPE_DINE_IN.equals(orderType)) {
            throw new OrderBusinessException(MessageConstant.ORDER_TYPE_ERROR);
        }
        return orderType;
    }

    /*
     * 这些校验辅助方法用于把“查单 / 校验外卖状态 / 识别单型”集中处理，
     * 避免每个业务方法里重复写同样的判空和分支判断。
     */
    private boolean isTakeoutOrder(Order order) {
        return Order.ORDER_TYPE_TAKEOUT.equals(normalizeOrderType(order.getOrderType()));
    }

    private void validateTakeoutStatus(Order order, Integer expectedStatus) {
        if (!isTakeoutOrder(order) || !expectedStatus.equals(order.getStatus())) {
            throw new OrderBusinessException(MessageConstant.ORDER_STATUS_ERROR);
        }
    }

    private Order getOrderOrThrow(Integer id) {
        Order order = orderMapper.getById(id);
        if (order == null) {
            throw new OrderBusinessException(MessageConstant.ORDER_NOT_FOUND);
        }
        return order;
    }

    /*
     * 堂食单号生成规则：
     * 只统计当天堂食订单的最大 inNumber，然后 +1。
     * 用 synchronized 是为了在单实例服务里尽量降低并发下重复取号的风险。
     */
    private synchronized Integer generateDineInOrderNumber() {
        LocalDate today = LocalDate.now();
        LocalDateTime beginTime = LocalDateTime.of(today, LocalTime.MIN);
        LocalDateTime endTime = LocalDateTime.of(today, LocalTime.MAX);
        Integer maxInNumber = orderMapper.getMaxInNumberByDate(Order.ORDER_TYPE_DINE_IN, beginTime, endTime);
        return (maxInNumber == null ? 0 : maxInNumber) + 1;
    }

    /**
     * 抽出 page.getResult() 的内容，统一补齐订单摘要字符串
     *
     * 管理端列表页不是直接展示完整明细，所以这里把菜品拼成一行摘要返回。
     */
    private List<OrderVO> getOrderVOList(Page<Order> page) {
        List<OrderVO> orderVOList = new ArrayList<>();
        List<Order> ordersList = page.getResult();
        if (!CollectionUtils.isEmpty(ordersList)) {
            for (Order order : ordersList) {
                OrderVO orderVO = new OrderVO();
                BeanUtils.copyProperties(order, orderVO);
                orderVO.setOrderDishes(getOrderDishesStr(order));
                orderVOList.add(orderVO);
            }
        }
        return orderVOList;
    }

    /**
     * 根据订单 id 获取菜品摘要字符串
     */
    private String getOrderDishesStr(Order order) {
        List<OrderDetail> orderDetailList = orderDetailMapper.getById(order.getId());
        List<String> orderDishList = orderDetailList.stream()
                .map(x -> x.getName() + "*" + x.getNumber() + ";")
                .collect(Collectors.toList());
        return String.join("", orderDishList);
    }

    /**
     * 检查客户的收货地址是否超出配送范围
     *
     * 这是原有的外卖配送能力保留位，目前调用被注释掉了。
     * 如果后面重新启用配送范围校验，可以直接恢复外卖下单里的调用。
     */
    private void checkOutOfRange(String address) {
        Map<String, String> map = new HashMap<>();
        map.put("address", shopAddress);
        map.put("output", "json");
        map.put("ak", ak);

        String shopCoordinate = HttpClientUtil.doGet("https://api.map.baidu.com/geocoding/v3", map);
        JSONObject jsonObject = JSON.parseObject(shopCoordinate);
        if (!jsonObject.getString("status").equals("0")) {
            throw new OrderBusinessException("店铺地址解析失败");
        }

        JSONObject location = jsonObject.getJSONObject("result").getJSONObject("location");
        String lat = location.getString("lat");
        String lng = location.getString("lng");
        String shopLngLat = lat + "," + lng;

        map.put("address", address);
        String userCoordinate = HttpClientUtil.doGet("https://api.map.baidu.com/geocoding/v3", map);
        jsonObject = JSON.parseObject(userCoordinate);
        if (!jsonObject.getString("status").equals("0")) {
            throw new OrderBusinessException("收货地址解析失败");
        }

        location = jsonObject.getJSONObject("result").getJSONObject("location");
        lat = location.getString("lat");
        lng = location.getString("lng");
        String userLngLat = lat + "," + lng;

        map.put("origin", shopLngLat);
        map.put("destination", userLngLat);
        map.put("steps_info", "0");

        String json = HttpClientUtil.doGet("https://api.map.baidu.com/directionlite/v1/driving", map);
        jsonObject = JSON.parseObject(json);
        if (!jsonObject.getString("status").equals("0")) {
            throw new OrderBusinessException("配送路线规划失败");
        }

        JSONObject result = jsonObject.getJSONObject("result");
        JSONArray jsonArray = (JSONArray) result.get("routes");
        Integer distance = (Integer) ((JSONObject) jsonArray.get(0)).get("distance");
        if (distance > 5000) {
            throw new OrderBusinessException("超出配送范围");
        }
    }
}
