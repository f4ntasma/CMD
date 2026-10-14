package com.monkeycoffedevs.cmd.content;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public final class ContentRepositories {

    private ContentRepositories() {
    }

    public interface PostRepository extends JpaRepository<Post, Long> {

        @EntityGraph(attributePaths = "author")
        Page<Post> findByTypeAndPublishedTrue(Post.Type type, Pageable pageable);

        @EntityGraph(attributePaths = "author")
        Page<Post> findByPublishedTrue(Pageable pageable);

        @EntityGraph(attributePaths = "author")
        Optional<Post> findBySlug(String slug);

        @EntityGraph(attributePaths = "author")
        Page<Post> findAllBy(Pageable pageable);

        boolean existsBySlug(String slug);

        boolean existsBySlugAndIdNot(String slug, Long id);
    }

    public interface SiteSettingRepository extends JpaRepository<SiteSetting, String> {
    }
}
