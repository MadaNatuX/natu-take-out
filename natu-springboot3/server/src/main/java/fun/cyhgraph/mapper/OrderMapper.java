package fun.cyhgraph.mapper;

import com.github.pagehelper.Page;
import fun.cyhgraph.dto.GoodsSalesDTO;
import fun.cyhgraph.dto.OrderPageDTO;
import fun.cyhgraph.entity.Order;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Mapper
public interface OrderMapper {

    /**
     * 新增订单主表记录。
     * 这里会把订单公共字段和单双模型新增的 orderType、inNumber 一起写入。
     */
    void insert(Order order);

    @Select("select * from orders where id = #{id}")
    Order getById(Integer id);

    /**
     * 按订单号查询订单。
     * 主要用于支付阶段，避免依赖 service 层共享变量导致串单。
     */
    @Select("select * from orders where number = #{number} limit 1")
    Order getByNumber(String number);

    /**
     * 统一分页查询入口。
     * 用户端和管理端都复用这一个分页 SQL，通过 DTO 中不同条件做筛选。
     */
    Page<Order> page(OrderPageDTO orderPageDTO);

    void update(Order order);

    /**
     * 修改订单状态，支付状态，结账时间
     * @param orderStatus
     * @param orderPaidStatus
     * @param checkOutTime
     * @param id
     */
    @Update("update orders set status = #{orderStatus}, pay_status = #{orderPaidStatus}, checkout_time = #{checkOutTime} " +
            "where id = #{id}")
    void updateStatus(@Param("orderStatus") Integer orderStatus,
                      @Param("orderPaidStatus") Integer orderPaidStatus,
                      @Param("checkOutTime") LocalDateTime checkOutTime,
                      @Param("id") Integer id);

    @Select("select count(id) from orders where user_id = #{userId} and status = 1")
    Integer getUnPayCount(Integer userId);

    /**
     * 按状态统计订单数量，并支持按 orderType 进一步收口。
     */
    @Select("""
            <script>
            select count(id) from orders
            where status = #{status}
            <if test="orderType != null">
                and order_type = #{orderType}
            </if>
            </script>
            """)
    Integer countByStatus(@Param("status") Integer status, @Param("orderType") Integer orderType);

    /**
     * 根据状态和下单时间查询订单
     * @param status
     * @param orderTime
     */
    /**
     * 定时任务专用查询：
     * 按状态、超时时间、订单类型找出待处理的订单集合。
     */
    @Select("""
            <script>
            select * from orders
            where status = #{status}
              and order_time &lt; #{orderTime}
            <if test="orderType != null">
                and order_type = #{orderType}
            </if>
            </script>
            """)
    List<Order> getByStatusAndOrderTimeLT(@Param("status") Integer status,
                                          @Param("orderTime") LocalDateTime orderTime,
                                          @Param("orderType") Integer orderType);

    /**
     * 查询当天堂食订单的最大 inNumber，用来生成新的堂食流水号。
     */
    @Select("""
            <script>
            select coalesce(max(in_number), 0) from orders
            where order_type = #{orderType}
              and order_time &gt;= #{beginTime}
              and order_time &lt;= #{endTime}
            </script>
            """)
    Integer getMaxInNumberByDate(@Param("orderType") Integer orderType,
                                 @Param("beginTime") LocalDateTime beginTime,
                                 @Param("endTime") LocalDateTime endTime);

    Double sumByMap(Map map);

    Integer countByMap(Map map);

    List<GoodsSalesDTO> getSalesTop10(LocalDateTime beginTime, LocalDateTime endTime);
}
