import { useContext } from "react";
import API from "./API";
import { AuthContext } from "./AuthContext";

export default function Dashboard({ path, method }) {
    const { user } = useContext(AuthContext)
    return (
        user ? (<>
            <API label="Server Status" path="/server" description="Get the current status of the host server" />
            <API label="Server Start" path="/server/start" async description="Start the host server if it is not running" />
            <API label="Server Stop" path="/server/stop" async description="Stop the host server if it is running" />
            <API label="Server Update" path="/server/update" async description="Update the OS and software on the server" />
            <API label="Server Restart" path="/server/restart" async description="Restart the host server" />
            <API label="Satisfactory Status" path="/satisfactory" description="Get the status of the game server service" />
            <API label="Satisfactory Start" path="/satisfactory/start" async description="Start the game server service if it is not running" />
            <API label="Satisfactory Stop" path="/satisfactory/stop" async description="Stop the game server service if it is running" />
            <API label="Satisfactory Update" path="/satisfactory/update" async description="Update to the latest version of the dedicated server from steam" />
        </>) : (<></>)
    )
}