import { Request, Response } from 'express';

type ContextType = {
    [key: string]: any
}
type WSParamsType = {
    [key: string]: any
}

type HtmlContextParamsType<C> = {
    req: Request,
    res: Response,
    connection?: {
        context?: C
    }
};

export
abstract class Context<C extends ContextType = any, WSParams extends WSParamsType = any> {
    constructor() {
        this.httpContext = this.httpContext.bind(this);
        this.wsContext = this.wsContext.bind(this);
    }

    abstract _httpContext(req: Request, res: Response): C | Promise<C>;

    abstract _wsContext(params: WSParams, req: Request): C | Promise<C>;

    wsContext(connectionParams: WSParams, webSocket: any): C | Promise<C> {
        return this._wsContext(connectionParams, webSocket.upgradeReq);
    }

    httpContext({ req, res, connection }: HtmlContextParamsType<C>): C | Promise<C> {
        if (connection && connection.context) {
            return connection.context;
        }

        return this._httpContext(req, res);
    }
}
