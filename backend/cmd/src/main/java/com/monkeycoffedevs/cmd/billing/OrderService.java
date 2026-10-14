package com.monkeycoffedevs.cmd.billing;

import com.monkeycoffedevs.cmd.billing.OrderDtos.AdminOrder;
import com.monkeycoffedevs.cmd.billing.OrderDtos.OrderDto;
import com.monkeycoffedevs.cmd.billing.OrderDtos.OrderRequest;
import com.monkeycoffedevs.cmd.billing.OrderDtos.ReviewRequest;
import com.monkeycoffedevs.cmd.catalog.CatalogService;
import com.monkeycoffedevs.cmd.catalog.Course;
import com.monkeycoffedevs.cmd.common.ApiException;
import com.monkeycoffedevs.cmd.common.PageResponse;
import com.monkeycoffedevs.cmd.learning.Enrollment;
import com.monkeycoffedevs.cmd.learning.LearningService;
import com.monkeycoffedevs.cmd.user.UserRepository;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Compras con confirmación manual. Aprobar una orden y dar acceso al curso ocurren en la misma transacción.
 * Una pasarela de pagos futura solo tendría que llamar a {@link #review} cuando el cobro se confirme.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final CatalogService catalogService;
    private final LearningService learningService;

    @Transactional
    public OrderDto create(Long userId, OrderRequest request) {
        Course course = catalogService.publishedCourse(request.courseSlug());
        if (course.isFree()) {
            throw ApiException.badRequest("Este curso es gratuito: inscríbete directamente");
        }
        if (learningService.isEnrolled(userId, course.getId())) {
            throw ApiException.conflict("Ya tienes acceso a este curso");
        }
        if (orderRepository.existsByUserIdAndCourseIdAndStatus(userId, course.getId(), Order.Status.PENDING)) {
            throw ApiException.conflict("Ya registraste un pago de este curso y está en revisión");
        }
        Order order = new Order();
        order.setUser(userRepository.getReferenceById(userId));
        order.setCourse(course);
        order.setAmount(course.getPrice());
        order.setCurrency(course.getCurrency());
        order.setPaymentMethod(request.paymentMethod());
        order.setPaymentReference(request.paymentReference().trim());
        return OrderDto.from(orderRepository.save(order));
    }

    public List<OrderDto> mine(Long userId) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId).stream().map(OrderDto::from).toList();
    }

    public PageResponse<AdminOrder> byStatus(Order.Status status, Pageable pageable) {
        return PageResponse.of(orderRepository.findByStatus(status, pageable).map(AdminOrder::from));
    }

    @Transactional
    public AdminOrder review(Long orderId, ReviewRequest request, Long reviewerId) {
        Order order = orderRepository.findById(orderId).orElseThrow(() -> ApiException.notFound("Orden no encontrada"));
        if (order.getStatus() != Order.Status.PENDING) {
            throw ApiException.conflict("Esta orden ya fue revisada");
        }
        order.setStatus(request.approve() ? Order.Status.APPROVED : Order.Status.REJECTED);
        order.setReviewNote(request.note() == null || request.note().isBlank() ? null : request.note().trim());
        order.setReviewedBy(reviewerId);
        order.setReviewedAt(Instant.now());
        if (request.approve()) {
            learningService.enroll(order.getUser().getId(), order.getCourse(), Enrollment.Source.PURCHASE);
        }
        return AdminOrder.from(order);
    }
}
