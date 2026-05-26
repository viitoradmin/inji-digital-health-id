package io.mosip.certify.core.exception;

public class RecordConflictException extends RuntimeException {

    private final String errorCode;

    public RecordConflictException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
