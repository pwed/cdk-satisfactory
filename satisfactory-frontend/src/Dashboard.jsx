import { useContext } from "react";
import API from "./API";
import { AuthContext } from "./AuthContext";

export default function Dashboard({ path, method }) {
    const { user } = useContext(AuthContext)
    return (
        user ? (<>
            <API label="Server Status" path="/server" />
            <API label="Server Start" path="/server/start" async />
            <API label="Server Stop" path="/server/stop" async />
            <API label="Server Update" path="/server/update" async />
            <API label="Server Restart" path="/server/restart" async />
            <API label="Satisfactory Status" path="/satisfactory" />
            <API label="Satisfactory Start" path="/satisfactory/start" async />
            <API label="Satisfactory Stop" path="/satisfactory/stop" async />
            <API label="Satisfactory Update" path="/satisfactory/update" async />
        </>) : (<></>)
    )
}