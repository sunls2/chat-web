import "./App.css";
import React, {useEffect, useRef, useState} from "react";
import {ClearOutlined, SettingOutlined} from "@ant-design/icons";
import {Button, Card, Input, message, notification, Popconfirm, Typography} from "antd";

import ChatAPI from "./api/ChatAPI";
import Settings from "./components/Settings";
import {ConfigKey, UseBing, UseChatGPT, UseMap} from "./constant";
import {merge, throttle} from "lodash";
import Markdown from "./components/Markdown";
import IconBtn from "./components/IconBtn";

const Text = Typography

const defaultConfig = {
    clientToUse: UseChatGPT,
    jailbreak: false,
    openaiApiKey: "",
    resendRetain: false,
}
const api = new ChatAPI()

function App() {
    const [config, setConfig] = useState(merge(defaultConfig, JSON.parse(localStorage.getItem(ConfigKey))));
    const [chatList, setChatList] = useState([])

    const inputRef = useRef(null)
    const bottomRef = useRef(null)

    const [messageApi, messageHolder] = message.useMessage()
    const [notificationApi, notificationHolder] = notification.useNotification()

    const [inputText, setInputText] = useState("")
    const [typing, setTyping] = useState(false)
    const [lastSend, setLastSend] = useState();

    const scrollRef = useRef(throttle(() => {
        console.debug("scrollIntoView")
        bottomRef.current.scrollIntoView({behavior: "smooth"})
    }, 500));
    const [scrollToView, setScrollToView] = useState(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        // didUpdate
        if (scrollToView) {
            setScrollToView(false)
            scrollRef.current()
        }
    })

    useEffect(() => {
        console.debug("mount")
        return () => {
            console.debug("umount")
            saveConfig()
        }
    }, [])

    function saveConfig() {
        setConfig(config => {
            console.debug("save config:", config)
            localStorage.setItem(ConfigKey, JSON.stringify(config))
            return config
        })
    }

    function onSendClick() {
        onSend()
    }

    function onSend(resend) {
        if (typing) {
            messageApi.warning("Typing in progress.")
            return
        }
        const inputValue = resend || inputRef.current.input.value
        if (!inputValue.trim()) {
            messageApi.warning("There is nothing.")
            return
        }

        setScrollToView(true)
        if (!resend) {
            setLastSend(inputValue)
            setInputText("")
            setChatList(chatList => {
                if (chatList.length !== 0) {
                    chatList[chatList.length - 1].resend = false
                }
                return [...chatList, {content: inputValue, right: true}]
            })
        }
        if (config.resendRetain && resend) {
            setChatList(chatList => {
                chatList[chatList.length - 1].resend = false
                return [...chatList]
            })
        }

        // loading
        setChatList(chatList => [...chatList, {loading: true}])
        setTyping(true)
        api.conversation(inputValue, config, {
            onopen: () => {
                setChatList(chatList => {
                    if (chatList.length === 0) {
                        return chatList
                    }
                    let last = chatList[chatList.length - 1]
                    if (last.typing) {
                        return chatList
                    }
                    if (last.loading) {
                        last = {typing: true}
                    }
                    return [...chatList.slice(0, -1), last]
                })
            },
            onmessage: (message) => {
                setChatList(chatList => {
                    if (chatList.length === 0 || !chatList[chatList.length - 1].typing) {
                        return chatList
                    }
                    setScrollToView(true)
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
                last.resend = true
                return [...chatList.slice(0, -1), last]
            })
        }).catch(err => {
            console.error("catch:", err)
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
                last.resend = true

                const errText = `❌ 哎呀出错啦！\`${err}\`  \n*请联系邮箱获取帮助：\`${atob("YmljZWdvb2xsdXJnQG91dGxvb2suY29t")}\`*`
                last.content = last.content
                    ? `${last.content}  \n${errText}`
                    : errText
                return [...chatList.slice(0, -1), last]
            })
        }).finally(() => {
            console.debug("finally")
            setScrollToView(true)
            setTyping(false)
        })
    }

    function stopTyping() {
        api.controller?.abort()
        messageApi.success("Typing has stopped.")
    }

    function resend() {
        console.debug("resend:", lastSend)
        if (!config.resendRetain) {
            setChatList(chatList => {
                if (chatList.length === 0 || !chatList[chatList.length - 1].resend) {
                    return chatList
                }
                return [...chatList.slice(0, -1)]
            })
        }
        onSend(lastSend)
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

    const [modalOpen, setModalOpen] = useState(false);

    function settingsClose() {
        setModalOpen(false)
    }

    function updateConfig(newConfig) {
        setConfig(newConfig)
        saveConfig()
        if (config.clientToUse !== newConfig.clientToUse
            || (config.clientToUse === UseBing && config.jailbreak !== newConfig.jailbreak)) {
            onClear()
        }
    }

    return (<Card
            title={
                <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                    <Text strong="true">{UseMap.get(config.clientToUse)}</Text>
                    {config.clientToUse === UseBing && config.jailbreak ?
                        <img className="jailbreak-img" src="img/jailbreak.png" alt="jailbreak"/> : null}
                    <div style={{flexGrow: 1, visibility: "hidden"}}/>
                    <Button type="link" icon={<SettingOutlined/>} onClick={() => setModalOpen(true)}></Button>
                </div>
            }
            style={{
                width: "95%",
                maxWidth: "840px",
                minWidth: "200px",
                height: "93%",
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
                        <Button size="large" onClick={onSendClick} type={"primary"}>Send</Button>
                    </Input.Group>
                    {typing ? <IconBtn onClick={stopTyping} src="icon/stop.svg" size="20px"/> : null}
                </div>
            ]}
            bodyStyle={{
                flex: 1,
                height: 0,
                display: "flex",
                flexFlow: "column nowrap",
                overflowY: "auto",
                padding: "0 2%",

                borderTop: "3px solid #82E0AA",
            }}
        >
            {chatList.length === 0 ?
                <div style={{
                    flex: "1",
                    display: "flex",
                    flexFlow: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "30px",
                }}>
                    <img className="empty-img"
                         src={`img/${config.clientToUse === UseBing ? UseBing : UseChatGPT}.png`} alt="empty"/>
                    <Text>{config.clientToUse === UseBing ?
                        "BingAI aids info search and Q&A."
                        : "ChatGPT is a large language model trained by OpenAI."}
                    </Text>
                </div>
                : chatList.map((item, i) => {
                    const style = {
                        marginTop: "10px",
                        display: "flex",
                        gap: "5px",
                    }
                    let emoji = "🤖"
                    if (item.right) {
                        style.justifyContent = "flex-end"
                        emoji = "🧐"
                    }

                    return <div style={style} key={i}>
                        <span style={{fontSize: "22px", marginTop: "-5px"}}>{emoji}</span>
                        <Card
                            style={{
                                maxWidth: "85%",
                                width: "fit-content",
                            }}
                            bodyStyle={{
                                padding: "0 10px",
                            }}
                        >
                            {item.loading ?
                                <div style={{"width": "50px", height: "42px", overflow: "hidden"}}>
                                    <img src="img/loading.gif" alt="loading" style={{
                                        width: "150px",
                                        position: "relative",
                                        left: "-50px",
                                        top: "-35px",
                                    }}/>
                                </div>
                                : <Markdown success={messageApi.success} content={item.content}/>}
                        </Card>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                            }}
                        >
                            {item.right ? null :
                                <div className={item.typing ? "gradient-loader" : ""}
                                     style={{width: "20px", height: "20px", flexShrink: 0}}/>}
                            {item.resend ?
                                <IconBtn style={{marginBottom: "2px"}} onClick={resend} src="icon/resend.png"
                                         size="20px"/> : null}
                        </div>

                    </div>
                })
            }
            <div ref={bottomRef} style={{marginTop: "10px"}}>
            </div>
            {messageHolder}
            {notificationHolder}
            <Settings open={modalOpen} settingsClose={settingsClose} config={config} updateConfig={updateConfig}/>
        </Card>
    )
}

export default App
