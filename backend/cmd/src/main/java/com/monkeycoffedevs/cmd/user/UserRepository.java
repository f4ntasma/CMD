package com.monkeycoffedevs.cmd.user;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByRole(Role role);

    long countByRoleAndEnabledTrue(Role role);

    /** {@code pattern} en minúsculas y con comodines, p. ej. "%ana%". */
    @Query("select u from User u where lower(u.email) like :pattern or lower(u.displayName) like :pattern")
    Page<User> search(@Param("pattern") String pattern, Pageable pageable);
}
