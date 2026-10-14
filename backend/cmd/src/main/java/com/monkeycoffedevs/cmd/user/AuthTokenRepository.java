package com.monkeycoffedevs.cmd.user;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuthTokenRepository extends JpaRepository<AuthToken, Long> {

    @EntityGraph(attributePaths = "user")
    Optional<AuthToken> findByTokenHashAndType(String tokenHash, AuthToken.Type type);

    /** Invalida los enlaces anteriores del mismo tipo: solo el último correo enviado sirve. */
    @Modifying
    @Query("update AuthToken t set t.usedAt = :now where t.user.id = :userId and t.type = :type and t.usedAt is null")
    void invalidate(@Param("userId") Long userId, @Param("type") AuthToken.Type type, @Param("now") Instant now);
}
