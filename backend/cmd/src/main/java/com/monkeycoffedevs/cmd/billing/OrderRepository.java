package com.monkeycoffedevs.cmd.billing;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface OrderRepository extends JpaRepository<Order, Long> {

    @EntityGraph(attributePaths = "course")
    List<Order> findByUserIdOrderByCreatedAtDesc(Long userId);

    boolean existsByUserIdAndCourseIdAndStatus(Long userId, Long courseId, Order.Status status);

    @EntityGraph(attributePaths = {"course", "user"})
    Page<Order> findByStatus(Order.Status status, Pageable pageable);

    long countByStatus(Order.Status status);

    @Query("select coalesce(sum(o.amount), 0) from Order o where o.status = com.monkeycoffedevs.cmd.billing.Order.Status.APPROVED")
    BigDecimal approvedRevenue();
}
