import { Connection, EntitySchema, ObjectLiteral, Repository, createConnection } from "typeorm";
import { EzApp, EzBackendServer } from "./ezapp";
import fastify, { FastifyInstance, FastifyPluginCallback } from "fastify";

import { EzError } from "@ezbackend/utils";
import { InjectOptions } from "light-my-request";
import { PluginScope } from "@ezbackend/core";
import _ from 'lodash'
import dotenv from 'dotenv'
import fp from 'fastify-plugin'

export interface EzBackendInstance {
    entities: Array<EntitySchema>
    server: EzBackendServer
    _server: FastifyInstance
    repo: Repository<ObjectLiteral>
    orm: Connection
}

export type RecursivePartial<T> = {
    [P in keyof T]? : RecursivePartial<T[P]>
}

export interface EzBackendOpts {
    /**
     * @deprecated Instead of {address: 0.0.0.0}
     * use
     * {ezbackend: {listen: {address: 0.0.0.0}}}
     */
    address: string
    /**
     * @deprecated Instead of {port: 8000}
     * use
     * {ezbackend: {listen: {port: 8000}}}
     */
    port: string | number
    /**
     * @deprecated Instead of {orm: ormOpts}
     * use
     * {ezbackend: {typeorm: ormOpts}}
     */
    orm: Parameters<typeof createConnection>[0]
    /**
     * @deprecated Instead of {server: serverOpts}
     * use
     * {ezbackend: {fastify: serverOpts}}
     */
    server: Parameters<typeof fastify>[0]
    ezbackend: {
        listen: {
            address: string | number
            port: number | string
            backlog?: number
        },
        fastify: Parameters<typeof fastify>[0],
        typeorm: Parameters<typeof createConnection>[0]
    }
}

//TODO: Check if emojis will break instance names
//URGENT TODO: Strict types for instance, opts
async function addErrorSchema(instance: EzBackendInstance, opts: EzBackendOpts) {
    instance.server.addSchema({
        "$id": "ErrorResponse",
        type: 'object',
        properties: {
            statusCode: { type: 'number' },
            error: { type: 'string' },
            message: { type: 'string' }
        }
    })
}

//URGENT TODO: Make running this optional in the default config
dotenv.config()

const defaultConfig: EzBackendOpts['ezbackend'] = {
    listen: {
        port: process.env.PORT || 8000,
        address: process.env.ADDRESS || "127.0.0.1",
    },
    fastify: {
        logger: {
            prettyPrint: {
                translateTime: "SYS:HH:MM:ss",
                ignore: "pid,hostname,reqId,responseTime,req,res",
                //@ts-ignore
                messageFormat: (log, messageKey, levelLabel) => {
                    const method = log.req?.method
                    const url = log.req?.url
                    const status = log.res?.statusCode
                    const resTime = log.responseTime?.toFixed(2)
                    const msg = log[messageKey]
                    if (method && url) {
                        return `${`[${method} ${url}`.padEnd(25, '.')}] ${msg}`
                    }
                    if (status && resTime) {
                        return `${`[${status} ${resTime}ms`.padEnd(25, '.')}] ${msg}`
                    }
                    return msg
                },
            },
        },
    },
    typeorm: {
        type: "better-sqlite3",
        database: "tmp/db.sqlite",
        synchronize: true
    }
}

// Derived from https://github.com/jeromemacias/fastify-boom/blob/master/index.js
// Kudos to him
const ezbErrorPage: FastifyPluginCallback<{}> = (fastify, options, next) => {
    //TODO: Strict types for error
    fastify.setErrorHandler(function errorHandler(error: any, request, reply) {
        request.log.error(error)
        if (error && error.query) {
            //Assumption: It is a typeorm error if it falls here
            request.log.error(`query: ${error.query}`)
            request.log.error(`parameters: ${error.parameters}`)
            request.log.error(`driverError: ${error.driverError}`)
        }
        if (error && error.isBoom) {
            reply
                .code(error.output.statusCode)
                .type('application/json')
                .headers(error.output.headers)
                .send(error.output.payload)

            return
        }

        reply.send(error || new Error(`Got non-error: ${error}`))
    })

    next()
}

/**
 * Child of EzApp. This is where you set up your backend setup tasks.
 */
export class EzBackend extends EzApp {

    constructor() {
        super()

        this.setDefaultOpts(defaultConfig)

        this.setInit('Create Entities Container', async (instance, opts) => {
            instance.entities = []
        })
        this.setPostInit('Create Database Connection', async (instance, opts) => {

            const ormOpts = opts.orm ?? this.getOpts('ezbackend', opts)?.typeorm!

            if (ormOpts.entities) {
                console.warn("Defining your own entities outside of the EzBackend orm wrapper may result in unexpected interactions. The EzBackend orm wrapper provides the full capability of typeorm so that should be used instead.")
            }

            const optionEntities = ormOpts?.entities ? ormOpts.entities : []

            instance.orm = await createConnection(
                {
                    ...ormOpts,
                    entities: [
                        ...optionEntities,
                        ...instance.entities
                    ]
                }
            )
        })

        this.setHandler('Add Fastify Boom', async (instance, opts) => {
            instance.server.register(fp(ezbErrorPage))
        })
        this.setHandler('Add Error Schema', addErrorSchema)

        this.setPostHandler('Create Fastify Server', async (instance, opts) => {
            const fastifyOpts = opts.server ?? this.getOpts('ezbackend', opts)?.fastify!

            instance._server = fastify(fastifyOpts)
        })

        this.setPostHandler('Register Fastify Plugins', async (instance, opts) => {
            this.registerFastifyPlugins(instance._server, this)
        })

        this.setRun('Run Fastify Server', async (instance, opts) => {

            const listenOpts = this.getOpts('ezbackend', opts)
            const port = opts.port ?? listenOpts?.listen.port
            const address = opts.address ?? listenOpts?.listen.address
            const backlog = listenOpts?.listen.backlog

            await instance._server.listen(port, address, backlog)
        })

        this.scope = PluginScope.PARENT

    }

    getInternalInstance() {
        //TODO: Figure if there is a better way of getting this data
        //@ts-ignore
        const lastPlugin = this.instance._lastUsed
        if (lastPlugin === null) {
            throw new Error("Server is still undefined, have you called app.start() yet?")
        }
        return lastPlugin.server as EzBackendInstance
    }

    getInternalServer() {
        return this.getInternalInstance()._server
    }

    async inject(injectOpts: string | InjectOptions) {
        const server = this.getInternalServer()
        return server.inject(injectOpts)
    }

    verifyStarted(funcName?: string) {
        if (!this.instance.started) {

            const additionalMsg = funcName
                ? `before running ${funcName}`
                : ''

            throw new EzError("Instance not yet started",
                `The EzBackend instance must be started ${additionalMsg}`,
                `
await app.start()

You must wait for the above function to finish before you can run ${funcName}
`)
        }
    }

    printRoutes() {
        this.verifyStarted("printRoutes")
        return this.getInternalServer().printRoutes()
    }

    printPlugins() {
        this.verifyStarted("printPlugins")
        return this.getInternalServer().printPlugins()
    }

    prettyPrint() {
        this.verifyStarted("prettyPrint")
        return this.instance.prettyPrint()
    }

    //URGENT TODO: Remove temporary any fix
    async start(opts?: RecursivePartial<EzBackendOpts>) {
        await super.start(opts)
    }

}