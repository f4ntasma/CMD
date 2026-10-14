package com.monkeycoffedevs.cmd.catalog;

import com.monkeycoffedevs.cmd.catalog.CatalogDtos.AdminCourse;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.AdminLesson;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.AdminModule;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.AdminPath;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.AdminQuiz;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.CategoryDto;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.CategoryRequest;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.CourseRequest;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.LessonRequest;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.ModuleRequest;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.PathRequest;
import com.monkeycoffedevs.cmd.catalog.CatalogDtos.QuizRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminCatalogController {

    private final AdminCatalogService service;

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryDto createCategory(@Valid @RequestBody CategoryRequest request) {
        return service.saveCategory(null, request);
    }

    @PutMapping("/categories/{id}")
    public CategoryDto updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        return service.saveCategory(id, request);
    }

    @DeleteMapping("/categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@PathVariable Long id) {
        service.deleteCategory(id);
    }

    @GetMapping("/courses")
    public List<AdminCourse> courses() {
        return service.courses();
    }

    @GetMapping("/courses/{id}")
    public AdminCourse course(@PathVariable Long id) {
        return service.course(id);
    }

    @PostMapping("/courses")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminCourse createCourse(@Valid @RequestBody CourseRequest request) {
        return service.saveCourse(null, request);
    }

    @PutMapping("/courses/{id}")
    public AdminCourse updateCourse(@PathVariable Long id, @Valid @RequestBody CourseRequest request) {
        return service.saveCourse(id, request);
    }

    @DeleteMapping("/courses/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCourse(@PathVariable Long id) {
        service.deleteCourse(id);
    }

    @PostMapping("/courses/{courseId}/modules")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminModule addModule(@PathVariable Long courseId, @Valid @RequestBody ModuleRequest request) {
        return service.addModule(courseId, request);
    }

    @PutMapping("/modules/{id}")
    public AdminModule updateModule(@PathVariable Long id, @Valid @RequestBody ModuleRequest request) {
        return service.updateModule(id, request);
    }

    @DeleteMapping("/modules/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteModule(@PathVariable Long id) {
        service.deleteModule(id);
    }

    @PostMapping("/modules/{moduleId}/lessons")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminLesson addLesson(@PathVariable Long moduleId, @Valid @RequestBody LessonRequest request) {
        return service.addLesson(moduleId, request);
    }

    @PutMapping("/lessons/{id}")
    public AdminLesson updateLesson(@PathVariable Long id, @Valid @RequestBody LessonRequest request) {
        return service.updateLesson(id, request);
    }

    @DeleteMapping("/lessons/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteLesson(@PathVariable Long id) {
        service.deleteLesson(id);
    }

    @PutMapping("/modules/{moduleId}/quiz")
    public AdminQuiz saveQuiz(@PathVariable Long moduleId, @Valid @RequestBody QuizRequest request) {
        return service.saveQuiz(moduleId, request);
    }

    @DeleteMapping("/modules/{moduleId}/quiz")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteQuiz(@PathVariable Long moduleId) {
        service.deleteQuiz(moduleId);
    }

    @GetMapping("/paths")
    public List<AdminPath> paths() {
        return service.paths();
    }

    @PostMapping("/paths")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminPath createPath(@Valid @RequestBody PathRequest request) {
        return service.savePath(null, request);
    }

    @PutMapping("/paths/{id}")
    public AdminPath updatePath(@PathVariable Long id, @Valid @RequestBody PathRequest request) {
        return service.savePath(id, request);
    }

    @DeleteMapping("/paths/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePath(@PathVariable Long id) {
        service.deletePath(id);
    }
}
