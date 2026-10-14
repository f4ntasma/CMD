package com.monkeycoffedevs.cmd.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;

/** Ruta de aprendizaje: cursos en el orden recomendado para seguirlos. */
@Entity
@Table(name = "learning_paths")
@Getter
@Setter
public class LearningPath {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String slug;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, length = 600)
    private String description = "";

    @Column(nullable = false)
    private boolean published;

    @Column(nullable = false)
    private int position;

    @ManyToMany
    @JoinTable(name = "learning_path_courses",
            joinColumns = @JoinColumn(name = "path_id"),
            inverseJoinColumns = @JoinColumn(name = "course_id"))
    @OrderColumn(name = "position")
    private List<Course> courses = new ArrayList<>();
}
