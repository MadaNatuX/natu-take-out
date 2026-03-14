package fun.cyhgraph.dto;

import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
public class OrderPageDTO implements Serializable {

    /*
     * 统一分页查询 DTO：
     * 兼容用户端历史订单和管理端订单列表，
     * 通过新增 orderType 实现同一路由下的单双模型筛选。
     */
    private int page;
    private int pageSize;
    private String number;
    private String phone;
    private Integer status;
    // 不传时由业务层默认按外卖处理，避免旧页面立即失效。
    private Integer orderType;
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime beginTime;
    @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime endTime;
    private Integer userId;

}
