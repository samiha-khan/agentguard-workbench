package dev.samihakh.agentguard.eval;

public class InvalidPrUrlException extends RuntimeException {
    public InvalidPrUrlException(String prUrl) {
        super("\"" + prUrl + "\" is not a GitHub pull request URL, such as https://github.com/owner/repo/pull/123");
    }
}
