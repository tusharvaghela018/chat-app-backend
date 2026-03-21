class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;
    public errors?: any; // 👈 add this

    constructor(
        message: string,
        statusCode: number = 400,
        errors?: any
    ) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.errors = errors; // 👈 store extra details
        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;