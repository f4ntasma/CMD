package com.monkeycoffedevs.cmd.content;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;

public final class ContentDtos {

    private ContentDtos() {
    }

    public record PostCard(Long id, String slug, Post.Type type, String title, String excerpt, String coverUrl,
                           String authorName, Instant publishedAt) {

        static PostCard from(Post post) {
            return new PostCard(post.getId(), post.getSlug(), post.getType(), post.getTitle(), post.getExcerpt(),
                    post.getCoverUrl(), post.getAuthor().getDisplayName(), post.getPublishedAt());
        }
    }

    public record PostDetail(PostCard post, String contentHtml) {
    }

    /** Publicación en crudo (Markdown) para el editor del panel. */
    public record AdminPost(Long id, String slug, Post.Type type, String title, String excerpt, String content,
                            String coverUrl, boolean published, Instant publishedAt) {

        static AdminPost from(Post post) {
            return new AdminPost(post.getId(), post.getSlug(), post.getType(), post.getTitle(), post.getExcerpt(),
                    post.getContent(), post.getCoverUrl(), post.isPublished(), post.getPublishedAt());
        }
    }

    public record PostRequest(
            @NotNull Post.Type type,
            @NotBlank @Size(max = 160) String title,
            @Size(max = 160) @Pattern(regexp = "^$|^[a-z0-9]+(-[a-z0-9]+)*$",
                    message = "solo minúsculas, números y guiones") String slug,
            @NotBlank @Size(max = 300) String excerpt,
            @NotNull @Size(max = 100_000) String content,
            @Size(max = 500) @Pattern(regexp = "^$|^https://.+", message = "debe empezar por https://")
            String coverUrl,
            boolean published) {
    }

    public record Video(String id, String title, Instant publishedAt, String thumbnailUrl) {
    }

    public record DiscordStatus(String name, int onlineCount, String inviteUrl) {
    }

    public record DashboardStats(long students, long publishedCourses, long enrollments, long completedCourses,
                                 long pendingOrders, BigDecimal revenue) {
    }
}
