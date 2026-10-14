package com.monkeycoffedevs.cmd.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "categories")
@Getter
@Setter
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String slug;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(length = 300)
    private String description;

    /** Color de acento en formato #RRGGBB. */
    @Column(nullable = false, length = 7)
    private String color = "#E8431F";

    @Column(nullable = false)
    private int position;
}
