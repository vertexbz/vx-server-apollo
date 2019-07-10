import * as net from 'net';
import http from 'http';
import { ApolloServer, ServerRegistration } from 'apollo-server-express';
import { ServerPluginInterface, ServerTapsType } from 'vx-experess-server/dist/type';

type ApolloPluginOptionsType = Omit<ServerRegistration, 'app'>;

export
class ApolloPlugin implements ServerPluginInterface {
    static defaultOptions = {
        path: '/graphql',
        bodyParserConfig: {
            limit: '50mb'
        }
    };

    _apollo: ApolloServer;
    _options: ApolloPluginOptionsType;

    constructor(apollo: ApolloServer, options?: ApolloPluginOptionsType) {
        this._apollo = apollo;
        this._options = {
            ...(this.constructor as typeof ApolloPlugin).defaultOptions,
            ...options,
            bodyParserConfig: {
                ...(this.constructor as typeof ApolloPlugin).defaultOptions.bodyParserConfig,
                // @ts-ignore
                ...((options && options.bodyParserConfig) || {})
            }
        };
    }

    register({ afterRoutes, beforeStart }: ServerTapsType) {
        afterRoutes.tap('Apollo', (express) => {
            this._apollo.applyMiddleware({ ...this._options, app: express });
        });

        beforeStart.tap('Apollo', (server: net.Server) => {
            this._apollo.installSubscriptionHandlers(server as http.Server);
        });
    }
}
