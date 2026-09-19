package dev.samihakh.agentguard.eval;

public class RunNotFoundException extends RuntimeException {
    public RunNotFoundException(Long id) { super("Evaluation run " + id + " was not found"); }
}

