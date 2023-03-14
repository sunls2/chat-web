import "./App.css";
import {ClearOutlined} from "@ant-design/icons";
import {Button, Card, Empty, Input, message, notification, Popconfirm, Typography} from "antd";
import React, {useEffect, useRef, useState} from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm'
import SyntaxHighlighter from 'react-syntax-highlighter';
import {atomOneLight} from 'react-syntax-highlighter/dist/esm/styles/hljs';

const Text = Typography

axios.defaults.timeout = 60000;

class chatAPI {
    static conversation = "/conversation"

    conversationId
    messageId
    controller

    conversation(message) {
        this.controller = new AbortController();
        return axios.post(chatAPI.conversation, {
            message,
            ...(this.messageId && {parentMessageId: this.messageId}),
            ...(this.conversationId && {conversationId: this.conversationId})
        }, {signal: this.controller.signal}).then(({data}) => {
            this.conversationId = data.conversationId
            this.messageId = data.messageId
            return data
        })
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

    const inputRef = useRef();
    const bottomRef = useRef();
    const mounted = useRef();

    const [messageApi, messageHolder] = message.useMessage();
    const [notificationApi, notificationHolder] = notification.useNotification();

    const [inputText, setInputText] = useState("");
    const [typing, setTyping] = useState(false);

    const [scrollToView, setScrollToView] = useState(false);
    useEffect(() => {
        if (mounted.current) {
            // didUpdate
            console.log("didUpdate")
            if (scrollToView) {
                setScrollToView(false)
                console.log("scrollIntoView")
                bottomRef.current.scrollIntoView({behavior: "smooth"})
            }
        } else {
            // mount
            mounted.current = true;
            console.log("mount")
        }
    }, [scrollToView])

    function onSend() {
        if (typing) {
            messageApi.warning("typing.")
            return;
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
        setInputText("");
        setTyping(true)
        api.conversation(inputValue)
            .then(data => {
                console.log("then:", data)
                setChatList(chatList => {
                    if (chatList.length === 0) {
                        return []
                    }
                    chatList[chatList.length - 1].loading && chatList.pop()
                    return [...chatList, {content: data.response}]
                })
            })
            .catch(e => {
                console.log("catch:", e)
                setChatList(chatList => {
                    if (chatList.length === 0) {
                        return []
                    }
                    chatList[chatList.length - 1].loading && chatList.pop()
                    return [...chatList, {content: `❌ 哎呀出错啦！${e}`}]
                })
            })
            .finally(() => {
                console.log("finally")
                setScrollToView(true);
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
        setInputText(e.target.value);
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
                                            const match = /language-(\w+)/.exec(className || '')
                                            if (match) {
                                                lang = match[1]
                                            }
                                            return !inline ? (
                                                <SyntaxHighlighter
                                                    children={String(children).replace(/\n$/, '')}
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
                    </div>
                })}
            <div ref={bottomRef} style={{marginTop: "10px"}}>
            </div>
            {messageHolder}
            {notificationHolder}
        </Card>
    );
}

export default App;
