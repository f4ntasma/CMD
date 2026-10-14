package com.monkeycoffedevs.cmd.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/** Clase de un módulo: un video de YouTube, un texto en Markdown, o ambos. */
@Entity
@Table(name = "lessons")
@Getter
@Setter
public class Lesson {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "module_id", nullable = false)
    private CourseModule module;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(name = "youtube_video_id", length = 20)
    private String youtubeVideoId;

    /** Markdown. */
    @Column(nullable = false, columnDefinition = "text")
    private String content = "";

    @Column(name = "duration_seconds", nullable = false)
    private int durationSeconds;

    /** Visible para cualquiera, sin inscripción. */
    @Column(name = "free_preview", nullable = false)
    private boolean freePreview;

    @Column(nullable = false)
    private int position;
}
