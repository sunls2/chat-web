import "./App.css"
import {ClearOutlined} from "@ant-design/icons"
import {Button, Card, Empty, Input, message, notification, Popconfirm, Typography} from "antd"
import React, {useEffect, useRef, useState} from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import SyntaxHighlighter from "react-syntax-highlighter"
import {atomOneLight} from "react-syntax-highlighter/dist/esm/styles/hljs"
import {fetchEventSource} from "@microsoft/fetch-event-source"

const Text = Typography

class chatAPI {
    static conversation = "/conversation"
    static maxScrollWait = 5 // 优化滚动窗口的次数

    conversationId
    messageId
    controller

    async conversation(message, event) {
        const opts = {
            timeout: 60000,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message,
                stream: true,
                ...(this.messageId && {parentMessageId: this.messageId}),
                ...(this.conversationId && {conversationId: this.conversationId}),
            }),
        }

        console.debug("conversation:", opts.body)
        let reply = ""
        this.controller = new AbortController()
        let scrollWait = 1
        try {
            await fetchEventSource(chatAPI.conversation, {
                ...opts,
                signal: this.controller.signal,
                onopen(response) {
                    console.debug("onopen:", response)
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
                    throw new Error('Failed to send message. Server closed the connection unexpectedly.');
                },
                onmessage: message => {
                    // { data: "Hello", event: "", id: "", retry: undefined }
                    if (message.data === "[DONE]") {
                        this.controller.abort()
                        return
                    }
                    if (message.event === "result") {
                        const result = JSON.parse(message.data)
                        this.conversationId = result.conversationId
                        this.messageId = result.messageId
                        event.onmessage(result.response, true)
                        return
                    }
                    if (message.event === "error") {
                        throw new Error(JSON.parse(message.data).error)
                    }
                    reply += JSON.parse(message.data)
                    event.onmessage(reply, scrollWait % chatAPI.maxScrollWait === 0)
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

const api = new chatAPI()

function App() {
    const [chatList, setChatList] = useState([])

    const inputRef = useRef()
    const bottomRef = useRef()
    const mounted = useRef()

    const [messageApi, messageHolder] = message.useMessage()
    const [notificationApi, notificationHolder] = notification.useNotification()

    const [inputText, setInputText] = useState("")
    const [typing, setTyping] = useState(false)

    const [scrollToView, setScrollToView] = useState(false)
    useEffect(() => {
        if (mounted.current) {
            // didUpdate
            if (scrollToView) {
                setScrollToView(false)
                console.debug("scrollIntoView")
                bottomRef.current.scrollIntoView({behavior: "smooth"})
            }
        } else {
            // mount
            console.debug("mount")
            mounted.current = true
        }
    })

    function onSend() {
        if (typing) {
            messageApi.warning("typing.")
            return
        }
        const inputValue = inputRef.current.input.value
        if (!inputValue.trim()) {
            messageApi.warning("There is nothing.")
            return
        }

        setScrollToView(true)
        // 用户发送的信息
        setChatList(chatList => [...chatList, {
            content: inputValue,
            right: true,
        }])
        // loading
        setChatList(chatList => [...chatList, {loading: true}])
        setInputText("")
        setTyping(true)
        api.conversation(inputValue, {
            onopen: () => {
                setChatList(chatList => {
                    if (chatList.length === 0) {
                        return []
                    }
                    chatList[chatList.length - 1].loading && chatList.pop()
                    return [...chatList, {typing: true}]
                })
            },
            onmessage: (message, scroll) => {
                if (scroll) {
                    setScrollToView(true)
                }
                setChatList(chatList => {
                    if (chatList.length === 0 || !chatList[chatList.length - 1].typing) {
                        return chatList
                    }
                    const last = chatList[chatList.length - 1]
                    last.content = message
                    return [...chatList.slice(0, -1), last]
                })
            }
        }).then(() => {
            setChatList(chatList => {
                if (chatList.length === 0 || !chatList[chatList.length - 1].typing) {
                    return chatList
                }
                const last = chatList[chatList.length - 1]
                last.typing = false
                return [...chatList.slice(0, -1), last]
            })
        }).catch(err => {
            console.error("catch:", err)
            setScrollToView(true)
            setChatList(chatList => {
                if (chatList.length === 0) {
                    return chatList
                }
                const last = chatList[chatList.length - 1]
                if (!last.typing && !last.loading) {
                    return chatList
                }

                last.loading = false
                last.typing = false

                const errText = `❌ 哎呀出错啦！\`${err}\``
                last.content = last.content
                    ? `${last.content}  ${errText}`
                    : errText
                return [...chatList.slice(0, -1), last]
            })
        }).finally(() => {
            console.debug("finally")
            setTyping(false)
        })
    }

    function onClear() {
        api.clear()
        setChatList([])
        notificationApi.success({message: "New conversation started."})
    }

    // 记录是否正在输入，兼容中文输入的情况
    const [isComposition, setComposition] = useState(false)

    function handleComposition(e) {
        setComposition(e.type === "compositionstart")
    }

    function inputChange(e) {
        if (e.target.value === "\n") {
            return
        }
        setInputText(e.target.value)
    }

    function onPressEnter() {
        if (!isComposition) {
            onSend()
        }
    }

    return (<Card
            title={
                <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
                    <Text strong="true">ChatGPT</Text>
                </div>
            }
            style={{
                width: "95%",
                maxWidth: "840px",
                minWidth: "200px",
                height: "95%",
                minHeight: "300px",

                margin: "0 auto",
                display: "flex",
                flexDirection: "column",
            }}
            actions={[
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    margin: "0 10px",
                }}>
                    <Popconfirm
                        title="Reset this conversation?"
                        onConfirm={onClear}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button shape="round" icon={<ClearOutlined/>}/>
                    </Popconfirm>
                    <Input.Group compact style={{display: "flex"}}>
                        <Input
                            ref={inputRef}
                            showCount
                            size="large"
                            maxLength={2000}
                            value={inputText}
                            onPressEnter={onPressEnter}
                            onCompositionStart={handleComposition}
                            onCompositionEnd={handleComposition}
                            onChange={inputChange}
                            style={{textAlign: "left"}}
                            placeholder="Ask me anything. 🙋‍♂️">
                        </Input>
                        <Button size="large" onClick={onSend} type={"primary"}>Send</Button>
                    </Input.Group>
                </div>
            ]}
            bodyStyle={{
                flex: 1,
                height: 0,
                display: "flex",
                flexFlow: "column nowrap",
                overflowY: "auto",
                padding: "0 24px",

                borderTop: "3px solid #82E0AA",
            }}
        >
            {chatList.length === 0 ?
                <Empty description="There is nothing." style={{
                    flex: 1,
                    display: "flex",
                    flexFlow: "column nowrap",
                    justifyContent: "center",
                }}/> :
                chatList.map((item, i) => {
                    const style = {
                        marginTop: "10px",
                        display: "flex",
                        gap: "10px",
                    }
                    let emoji = "🤖"
                    if (item.right) {
                        style.justifyContent = "flex-end"
                        emoji = "🧐"
                    }

                    return <div style={style} key={i}>
                        <span style={{fontSize: "22px"}}>{emoji}</span>
                        <Card
                            style={{
                                maxWidth: "666px",
                                width: "fit-content",
                            }}
                            bodyStyle={{
                                padding: "0 10px",
                            }}
                        >
                            {item.loading ?
                                <div style={{"width": "50px", height: "42px", overflow: "hidden"}}>
                                    <img src="loading.gif" alt="loading" style={{
                                        width: "150px",
                                        position: "relative",
                                        left: "-50px",
                                        top: "-35px",
                                    }}/>
                                </div>
                                : <ReactMarkdown
                                    components={{
                                        code({inline, className, children, ...props}) {
                                            let lang = ""
                                            const match = /language-(\w+)/.exec(className || "")
                                            if (match) {
                                                lang = match[1]
                                            }
                                            return !inline ? (
                                                <SyntaxHighlighter
                                                    children={String(children).replace(/\n$/, "")}
                                                    language={lang}
                                                    style={atomOneLight}
                                                    {...props}
                                                />
                                            ) : (
                                                <code className="inlineCode" {...props}>
                                                    {children}
                                                </code>
                                            )
                                        }
                                    }}
                                    className="markdown"
                                    remarkPlugins={[remarkGfm]}>
                                    {item.content}
                                </ReactMarkdown>}
                        </Card>
                        {item.typing ? <div className="gradient-loader"/> : null}
                    </div>
                })}
            <div ref={bottomRef} style={{marginTop: "10px"}}>
            </div>
            {messageHolder}
            {notificationHolder}
        </Card>
    )
}

export default App
