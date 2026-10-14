package com.monkeycoffedevs.cmd.content;

import com.monkeycoffedevs.cmd.common.PageResponse;
import com.monkeycoffedevs.cmd.content.ContentDtos.DiscordStatus;
import com.monkeycoffedevs.cmd.content.ContentDtos.PostCard;
import com.monkeycoffedevs.cmd.content.ContentDtos.PostDetail;
import com.monkeycoffedevs.cmd.content.ContentDtos.Video;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ContentController {

    private final PostService postService;
    private final SiteService siteService;
    private final SocialFeedService socialFeedService;

    @GetMapping("/posts")
    public PageResponse<PostCard> posts(@RequestParam(required = false) Post.Type type,
                                        @RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "9") int size) {
        return postService.published(type, PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, 30),
                Sort.by(Sort.Direction.DESC, "publishedAt")));
    }

    @GetMapping("/posts/{slug}")
    public PostDetail post(@PathVariable String slug) {
        return postService.publishedBySlug(slug);
    }

    @GetMapping("/site/settings")
    public Map<String, String> settings() {
        return siteService.settings();
    }

    @GetMapping("/site/videos")
    public List<Video> videos() {
        return socialFeedService.latestVideos();
    }

    @GetMapping("/site/discord")
    public ResponseEntity<DiscordStatus> discord() {
        return socialFeedService.discord().map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }
}
