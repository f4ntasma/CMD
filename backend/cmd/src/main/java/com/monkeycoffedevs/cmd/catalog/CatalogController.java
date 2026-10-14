package com.monkeycoffedevs.cmd.catalog;

import com.monkeycoffedevs.cmd.catalog.CatalogDtos.CategoryDto;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.CourseCard;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.CourseDetail;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.PathCard;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.PathDetail;
import com.monkeycoffedevs.cmd.common.PageResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CatalogController {

    private static final int PAGE_SIZE = 12;

    private final CatalogService catalogService;

    @GetMapping("/categories")
    public List<CategoryDto> categories() {
        return catalogService.categories();
    }

    @GetMapping("/courses")
    public PageResponse<CourseCard> courses(@RequestParam(required = false) String category,
                                            @RequestParam(required = false) Course.Level level,
                                            @RequestParam(required = false) Boolean free,
                                            @RequestParam(defaultValue = "") String q,
                                            @RequestParam(defaultValue = "0") int page) {
        return catalogService.searchCourses(category, level, free, q,
                PageRequest.of(Math.max(page, 0), PAGE_SIZE, Sort.by(Sort.Direction.DESC, "publishedAt")));
    }

    @GetMapping("/courses/featured")
    public List<CourseCard> featured() {
        return catalogService.featuredCourses();
    }

    @GetMapping("/courses/{slug}")
    public CourseDetail course(@PathVariable String slug) {
        return catalogService.courseDetail(slug);
    }

    @GetMapping("/paths")
    public List<PathCard> paths() {
        return catalogService.paths();
    }

    @GetMapping("/paths/{slug}")
    public PathDetail path(@PathVariable String slug) {
        return catalogService.pathDetail(slug);
    }
}
