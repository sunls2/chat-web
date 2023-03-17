import {fetchEventSource} from "@microsoft/fetch-event-source";
import {UseBing} from "../constant";

export default class ChatAPI {
    static conversation = "/conversation"
    static maxScrollWait = 5 // 优化滚动窗口的次数
    static timeout = 60000

    conversationId
    jailbreakConversationId
    parentMessageId

    // Bing Only
    conversationSignature
    clientId
    invocationId

    controller

    async conversation(message, config, event) {
        const useBing = config.clientToUse === UseBing
        const opts = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message,
                stream: true,
                ...(this.conversationId && {conversationId: this.conversationId}),
                ...(useBing && config.jailbreak && {jailbreakConversationId: this.jailbreakConversationId || true}),
                ...(this.parentMessageId && {parentMessageId: this.parentMessageId}),

                ...(useBing && this.conversationSignature && {conversationSignature: this.conversationSignature}),
                ...(useBing && this.clientId && {clientId: this.clientId}),
                ...(useBing && this.invocationId && {invocationId: this.invocationId}),
                clientOptions: {
                    clientToUse: config.clientToUse
                }
            }),
        }

        console.debug("conversation:", opts.body)
        let reply
        let timer
        let scrollWait = 1
        this.controller = new AbortController()
        const p1 = new Promise((_, reject) => {
            timer = setTimeout(() => {
                this.controller.abort()
                reject(`fetch event source timeout ${ChatAPI.timeout / 1000}s`)
            }, ChatAPI.timeout)
        })
        const p2 = new Promise(async (resolve, reject) => {
            try {
                await fetchEventSource(ChatAPI.conversation, {
                    ...opts,
                    signal: this.controller.signal,
                    onopen(response) {
                        console.debug("onopen:", response)
                        clearTimeout(timer)
                        if (response.status === 200) {
                            reply = ""
                            event.onopen(response)
                            return
                        }
                        throw new Error(`Failed to send message. HTTP ${response.status} - ${response.statusText}`)
                    },
                    onerror: err => {
                        throw err
                    },
                    onclose() {
                        throw new Error("Failed to send message. Server closed the connection unexpectedly.")
                    },
                    onmessage: message => {
                        if (message.data === "[DONE]") {
                            this.controller.abort()
                            return
                        }
                        if (message.event === "result") {
                            const result = JSON.parse(message.data)
                            console.debug("result:", result)
                            event.onmessage(result.response, true)

                            this.conversationId = result.conversationId
                            this.jailbreakConversationId = result.jailbreakConversationId
                            this.parentMessageId = result.messageId
                            this.conversationSignature = result.conversationSignature
                            this.clientId = result.clientId
                            this.invocationId = result.invocationId
                            return
                        }
                        if (message.event === "error") {
                            throw new Error(JSON.parse(message.data).error)
                        }
                        reply += JSON.parse(message.data)
                        event.onmessage(reply, scrollWait % ChatAPI.maxScrollWait === 0)
                        scrollWait++
                    },
                })
            } catch (err) {
                clearTimeout(timer)
                reject(err)
            }
            resolve()
        })

        return Promise.race([p1, p2])
    }

    clear() {
        this.controller?.abort()
        this.conversationId = null
        this.jailbreakConversationId = null
        this.parentMessageId = null
        this.conversationSignature = null
        this.clientId = null
        this.invocationId = null
    }
}