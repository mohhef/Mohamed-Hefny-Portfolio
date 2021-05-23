import BaseLayout from "@/components/layouts/BaseLayout"
import BasePage from "@/components/BasePage"
import { getSession } from '@auth0/nextjs-auth0';



const SecretSSR = ({ user }) => {
    return (
        <BaseLayout user={user} isLoading={false}>
            <BasePage>
                <h1>Hello{user && user.name}</h1>
            </BasePage>
        </BaseLayout>
    )
}

//this will be executed only on the server, nothing on the browser
export const getServerSideProps = async ({req,res}) => {
    const session = await getSession(req,res);
    if (!session || !session.user) {
        res.writeHead(302, {
            Location: 'api/v1/auth/login'
        });
        res.end();
        return {props:{}}
    }
    console.log(user);
    return {
        props: { user: session.user }
    }
}
export default SecretSSR