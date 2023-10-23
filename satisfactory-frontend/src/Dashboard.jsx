import { useContext } from "react";
import API from "./API";
import { AuthContext } from "./AuthContext";
import CardGroup from 'react-bootstrap/CardGroup';
import Card from 'react-bootstrap/Card';
import ServerStatus from "./ServerStatus";

export default function Dashboard() {
    const { user } = useContext(AuthContext)
    return (
        user ? (
            <>
                <CardGroup className="mt-3">
                    <ServerStatus />
                </CardGroup>
                <CardGroup className="mt-3">
                    <API label="Satisfactory Status" path="/satisfactory" description="Get the status of the game server service" />
                    <API label="Satisfactory Start" path="/satisfactory/start" description="Start the game server service if it is not running" />
                    <API label="Satisfactory Stop" path="/satisfactory/stop" description="Stop the game server service if it is running" />
                    <API label="Satisfactory Update" path="/satisfactory/update" async description="Update to the latest version of the dedicated server from steam" />
                </CardGroup>
            </>
        ) : (<>
            <Card className="mt-5 col-12 mx-auto p-3">
                <Card.Text>
                    Login or signup to control your Satisfactory game server
                </Card.Text>
                <Card.Text>
                    Signups will require approval from your admin
                </Card.Text>
            </Card>
        </>)
    )
}