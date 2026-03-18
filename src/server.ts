import App from "@/app";
import AuthRoute from "@/Routes/auth.route";

const appServer = new App([new AuthRoute()]);

appServer.listen();

export default appServer;
