package com.monkeycoffedevs.cmd.user;

import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserIdentityRepository extends JpaRepository<UserIdentity, Long> {

    @EntityGraph(attributePaths = "user")
    Optional<UserIdentity> findByProviderAndProviderUserId(AuthProvider provider, String providerUserId);

    boolean existsByUserIdAndProvider(Long userId, AuthProvider provider);
}
