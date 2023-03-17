import {fetchEventSource} from "@microsoft/fetch-event-source";

export default class ChatAPI {
    static conversation = "/conversation"
    static maxScrollWait = 5 // 优化滚动窗口的次数
    static timeout = 30000

    jailbreakConversationId
    conversationId
    messageId
    controller

    async conversation(message, event) {
        const opts = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message,
                stream: true,
                jailbreakConversationId: this.jailbreakConversationId || true,
                ...(this.messageId && {parentMessageId: this.messageId}),
                ...(this.conversationId && {conversationId: this.conversationId}),
                clientOptions: {
                    clientToUse: "bing"
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
                            this.conversationId = result.conversationId
                            this.jailbreakConversationId = result.jailbreakConversationId
                            this.messageId = result.messageId
                            event.onmessage(result.response, true)
                            console.debug("result:", result)
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
        this.messageId = null
    }
}