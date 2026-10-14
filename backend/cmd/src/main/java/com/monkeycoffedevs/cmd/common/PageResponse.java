package com.monkeycoffedevs.cmd.common;

import java.util.List;
import org.springframework.data.domain.Page;

/** Página serializable con forma estable, independiente de la representación interna de Spring Data. */
public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {

    public static <T> PageResponse<T> of(Page<?> page, List<T> content) {
        return new PageResponse<>(content, page.getNumber(), page.getSize(), page.getTotalElements(),
                page.getTotalPages());
    }

    public static <T> PageResponse<T> of(Page<T> page) {
        return of(page, page.getContent());
    }
}
