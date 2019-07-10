// @ts-ignore
import interceptor from 'express-interceptor';
import { ApolloServer as BaseApolloServer } from 'apollo-server-express';
import { OptionsJson } from 'body-parser';
import { Request, Response } from 'express';
import { ApolloServerExpressConfig, ServerRegistration } from 'apollo-server-express';
import { isObject, isString } from 'vx-std/dist/predicate';
import { Context } from './Context';

const playgroundEnhancer = (script: string) =>
    interceptor((req: Request, res: Response) => ({
        isInterceptable() {
            return /text\/html/.test(res.get('Content-Type'));
        },
        intercept(body: any, send: any) {
            send(body.replace('</body>', '<script type="text/javascript">\n' + script + '\n</script>\n  </body>'));
        }
    }));

type AdditionalOptions = {
    path: string,
    context?: Context<any, any>
    bodyParserConfig?: OptionsJson | boolean,
    onHealthCheck?: (req: Request) => Promise<any>,
    disableHealthCheck?: boolean,
}

type ScriptedPlayground = Extract<ApolloServerExpressConfig['context'], object> & {
    script?: string | null
}

type ApolloServerConfigType =
    Omit<ApolloServerExpressConfig, 'playground' | 'subscriptions' | 'context'> &
    Omit<AdditionalOptions, 'context'> &
    {
        context?: ApolloServerExpressConfig['context'] | AdditionalOptions['context'],
        playground?: Exclude<ApolloServerExpressConfig['context'], object> | ScriptedPlayground,
        subscriptions?: ApolloServerExpressConfig['subscriptions'] | true
    };

export class ApolloServer extends BaseApolloServer {
    private readonly _options: AdditionalOptions;
    private readonly _playgroundInject: string | null | undefined;

    private static _makePlaygroundOptions(playground: Exclude<ApolloServerConfigType['playground'], boolean>) {
        if (isObject(playground)) {
            const { script = undefined, ...rest } = playground;
            return rest;
        }

        return playground;
    }

    constructor({ path, bodyParserConfig, onHealthCheck, disableHealthCheck, playground, ...config }: ApolloServerConfigType) {
        if (config.context && config.context instanceof Context) {
            const context = config.context;
            // @ts-ignore
            config.context = context.httpContext;

            if (config.subscriptions) {
                if (config.subscriptions === true) {
                    config.subscriptions = { path };
                } else if (isString(config.subscriptions)) {
                    config.subscriptions = { path: config.subscriptions };
                }

                if (!config.subscriptions.onConnect) {
                    // @ts-ignore
                    config.subscriptions = config.subscriptions.onConnect = context.wsContext;
                }
            }
        }

        // @ts-ignore
        super({ ...config, playground: ApolloServer._makePlaygroundOptions(playground) });
        this._playgroundInject = playground && playground.script;
        this._options = { path, bodyParserConfig, onHealthCheck, disableHealthCheck };
    }

    applyMiddleware({ app }: ServerRegistration): void {
        if (this._playgroundInject) {
            app.use(this._options.path, playgroundEnhancer(this._playgroundInject));
        }

        super.applyMiddleware({ ...this._options, app });
    }
}
