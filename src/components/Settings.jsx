import {Modal} from "antd";
// onOk={handleOk} onCancel={handleCancel}
export default function Settings(props) {
    return (<Modal title="Basic Modal" open={props.open}>
        <p>Some contents...</p>
        <p>Some contents...</p>
        <p>Some contents...</p>
    </Modal>)
}