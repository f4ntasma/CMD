package com.monkeycoffedevs.cmd.billing;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;

public final class OrderDtos {

    private OrderDtos() {
    }

    public record OrderRequest(
            @NotBlank String courseSlug,
            @NotNull Order.PaymentMethod paymentMethod,
            @NotBlank @Size(max = 80) String paymentReference) {
    }

    public record ReviewRequest(boolean approve, @Size(max = 300) String note) {
    }

    public record OrderDto(Long id, String courseTitle, String courseSlug, BigDecimal amount, String currency,
                           Order.PaymentMethod paymentMethod, String paymentReference, Order.Status status,
                           String reviewNote, Instant createdAt, Instant reviewedAt) {

        static OrderDto from(Order order) {
            return new OrderDto(order.getId(), order.getCourse().getTitle(), order.getCourse().getSlug(),
                    order.getAmount(), order.getCurrency(), order.getPaymentMethod(), order.getPaymentReference(),
                    order.getStatus(), order.getReviewNote(), order.getCreatedAt(), order.getReviewedAt());
        }
    }

    public record AdminOrder(OrderDto order, Long userId, String userName, String userEmail) {

        static AdminOrder from(Order order) {
            return new AdminOrder(OrderDto.from(order), order.getUser().getId(), order.getUser().getDisplayName(),
                    order.getUser().getEmail());
        }
    }
}
