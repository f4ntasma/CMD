package com.monkeycoffedevs.cmd.content;

import com.monkeycoffedevs.cmd.common.ApiException;
import com.monkeycoffedevs.cmd.common.Markdown;
import com.monkeycoffedevs.cmd.common.PageResponse;
import com.monkeycoffedevs.cmd.common.Slugs;
import com.monkeycoffedevs.cmd.content.ContentDtos.AdminPost;
import com.monkeycoffedevs.cmd.content.ContentDtos.PostCard;
import com.monkeycoffedevs.cmd.content.ContentDtos.PostDetail;
import com.monkeycoffedevs.cmd.content.ContentDtos.PostRequest;
import com.monkeycoffedevs.cmd.content.ContentRepositories.PostRepository;
import com.monkeycoffedevs.cmd.user.UserRepository;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final Markdown markdown;

    /** Publicaciones visibles; {@code type} nulo mezcla artículos y noticias. */
    public PageResponse<PostCard> published(Post.Type type, Pageable pageable) {
        Page<Post> page = type == null ? postRepository.findByPublishedTrue(pageable)
                : postRepository.findByTypeAndPublishedTrue(type, pageable);
        return PageResponse.of(page.map(PostCard::from));
    }

    public PostDetail publishedBySlug(String slug) {
        Post post = postRepository.findBySlug(slug)
                .filter(Post::isPublished)
                .orElseThrow(() -> ApiException.notFound("Publicación no encontrada"));
        return new PostDetail(PostCard.from(post), markdown.toHtml(post.getContent()));
    }

    public PageResponse<AdminPost> all(Pageable pageable) {
        return PageResponse.of(postRepository.findAllBy(pageable).map(AdminPost::from));
    }

    @Transactional
    public AdminPost save(Long id, PostRequest request, Long authorId) {
        String slug = request.slug() == null || request.slug().isBlank()
                ? Slugs.slugify(request.title()) : request.slug().trim();
        if (slug.isEmpty()) {
            throw ApiException.badRequest("No se pudo generar una dirección a partir del título");
        }
        boolean taken = id == null ? postRepository.existsBySlug(slug)
                : postRepository.existsBySlugAndIdNot(slug, id);
        if (taken) {
            throw ApiException.conflict("Ya existe una publicación con la dirección '" + slug + "'");
        }
        Post post = id == null ? new Post() : get(id);
        if (post.getId() == null) {
            post.setAuthor(userRepository.getReferenceById(authorId));
        }
        post.setSlug(slug);
        post.setType(request.type());
        post.setTitle(request.title().trim());
        post.setExcerpt(request.excerpt().trim());
        post.setContent(request.content());
        post.setCoverUrl(request.coverUrl() == null || request.coverUrl().isBlank() ? null : request.coverUrl().trim());
        post.setPublished(request.published());
        if (request.published() && post.getPublishedAt() == null) {
            post.setPublishedAt(Instant.now());
        }
        return AdminPost.from(postRepository.save(post));
    }

    @Transactional
    public void delete(Long id) {
        postRepository.delete(get(id));
    }

    private Post get(Long id) {
        return postRepository.findById(id).orElseThrow(() -> ApiException.notFound("Publicación no encontrada"));
    }
}
