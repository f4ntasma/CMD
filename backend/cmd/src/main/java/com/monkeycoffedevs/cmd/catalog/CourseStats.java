package com.monkeycoffedevs.cmd.catalog;

/** Totales de un curso calculados en la base: número de clases y duración sumada. */
public record CourseStats(Long courseId, long lessonCount, long durationSeconds) {

    public static final CourseStats EMPTY = new CourseStats(null, 0, 0);
}
