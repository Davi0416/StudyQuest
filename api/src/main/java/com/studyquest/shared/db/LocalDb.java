package com.studyquest.shared.db;

import io.quarkus.hibernate.orm.PersistenceUnit;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;

import java.util.function.Consumer;
import java.util.function.Function;

@ApplicationScoped
public class LocalDb {

    @Inject
    @PersistenceUnit("local")
    EntityManagerFactory emf;

    public <T> T read(Function<EntityManager, T> action) {
        EntityManager em = emf.createEntityManager();
        try {
            return action.apply(em);
        } finally {
            em.close();
        }
    }

    public void write(Consumer<EntityManager> action) {
        EntityManager em = emf.createEntityManager();
        em.getTransaction().begin();
        try {
            action.accept(em);
            em.getTransaction().commit();
        } catch (RuntimeException e) {
            if (em.getTransaction().isActive()) {
                em.getTransaction().rollback();
            }
            throw e;
        } finally {
            em.close();
        }
    }
}
