package com.monkeycoffedevs.cmd.billing;

import com.monkeycoffedevs.cmd.billing.OrderDtos.AdminOrder;
import com.monkeycoffedevs.cmd.billing.OrderDtos.OrderDto;
import com.monkeycoffedevs.cmd.billing.OrderDtos.OrderRequest;
import com.monkeycoffedevs.cmd.billing.OrderDtos.ReviewRequest;
import com.monkeycoffedevs.cmd.common.PageResponse;
import com.monkeycoffedevs.cmd.user.AppPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping("/orders")
    @ResponseStatus(HttpStatus.CREATED)
    public OrderDto create(@Valid @RequestBody OrderRequest request, @AuthenticationPrincipal AppPrincipal principal) {
        return orderService.create(principal.getId(), request);
    }

    @GetMapping("/me/orders")
    public List<OrderDto> mine(@AuthenticationPrincipal AppPrincipal principal) {
        return orderService.mine(principal.getId());
    }

    @GetMapping("/admin/orders")
    public PageResponse<AdminOrder> byStatus(@RequestParam(defaultValue = "PENDING") Order.Status status,
                                             @RequestParam(defaultValue = "0") int page) {
        // Las pendientes, de la más antigua a la más nueva: se atiende primero a quien más lleva esperando.
        Sort sort = Sort.by(status == Order.Status.PENDING ? Sort.Direction.ASC : Sort.Direction.DESC, "createdAt");
        return orderService.byStatus(status, PageRequest.of(Math.max(page, 0), 30, sort));
    }

    @PutMapping("/admin/orders/{id}/review")
    public AdminOrder review(@PathVariable Long id, @Valid @RequestBody ReviewRequest request,
                             @AuthenticationPrincipal AppPrincipal principal) {
        return orderService.review(id, request, principal.getId());
    }
}
