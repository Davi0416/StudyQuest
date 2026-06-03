package com.studyquest.nos;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;

@ApplicationScoped
public class NoRepository implements PanacheRepository<No> {

    public List<No> findByTrilha(Long trilhaId) {
        return list("trilhaId", trilhaId);
    }
}
