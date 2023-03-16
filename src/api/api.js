import {fetchEventSource} from "@microsoft/fetch-event-source";

export default class ChatAPI {
    static conversation = '/conversation'
    static maxScrollWait = 5 // 优化滚动窗口的次数

    jailbreakConversationId
    conversationId
    messageId
    controller

    async conversation(message, event) {
        const opts = {
            timeout: 60000,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                stream: true,
                jailbreakConversationId: this.jailbreakConversationId || true,
                ...(this.messageId && {parentMessageId: this.messageId}),
                ...(this.conversationId && {conversationId: this.conversationId}),
                clientOptions: {
                    clientToUse: 'bing'
                }
            }),
        }

        console.debug('conversation:', opts.body)
        let reply = ''
        this.controller = new AbortController()
        let scrollWait = 1
        try {
            await fetchEventSource(ChatAPI.conversation, {
                ...opts,
                signal: this.controller.signal,
                onopen(response) {
                    console.debug('onopen:', response)
                    if (response.status === 200) {
                        event.onopen(response)
                        return
                    }
                    throw new Error(`Failed to send message. HTTP ${response.status} - ${response.statusText}`)
                },
                onerror: err => {
                    throw err
                },
                onclose() {
                    throw new Error('Failed to send message. Server closed the connection unexpectedly.')
                },
                onmessage: message => {
                    // { data: 'Hello', event: '', id: '', retry: undefined }
                    if (message.data === '[DONE]') {
                        this.controller.abort()
                        return
                    }
                    if (message.event === 'result') {
                        const result = JSON.parse(message.data)
                        this.conversationId = result.conversationId
                        this.jailbreakConversationId = result.jailbreakConversationId
                        this.messageId = result.messageId
                        event.onmessage(result.response, true)
                        console.debug('result:', result)
                        return
                    }
                    if (message.event === 'error') {
                        throw new Error(JSON.parse(message.data).error)
                    }
                    reply += JSON.parse(message.data)
                    event.onmessage(reply, scrollWait % ChatAPI.maxScrollWait === 0)
                    scrollWait++
                },
            })
        } catch (err) {
            this.controller.abort()
            return Promise.reject(err)
        }
    }

    clear() {
        this.controller?.abort()
        this.conversationId = null
        this.messageId = null
    }
}