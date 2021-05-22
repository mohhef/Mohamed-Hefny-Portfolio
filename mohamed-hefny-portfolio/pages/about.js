import BaseLayout from "@/components/layouts/BaseLayout"
import BasePage from "@/components/BasePage"
import { useUser } from '@auth0/nextjs-auth0';


const About = () => {
    const { user, error, isLoading } = useUser();
    return (
        <BaseLayout  user = {user} isLoading = {isLoading}>
            <BasePage>
                <h1>I am about page</h1>
            </BasePage>
        </BaseLayout>
    )
}
export default About;
