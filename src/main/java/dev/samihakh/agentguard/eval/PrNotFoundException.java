package dev.samihakh.agentguard.eval;

public class PrNotFoundException extends RuntimeException {
    public PrNotFoundException(String prUrl) {
        super("GitHub has no pull request at " + prUrl + " (it may be private or may not exist)");
    }
}
