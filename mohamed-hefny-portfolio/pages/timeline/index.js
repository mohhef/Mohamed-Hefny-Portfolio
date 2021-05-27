import BaseLayout from "@/components/layouts/BaseLayout"
import { useUser } from '@auth0/nextjs-auth0';
import TimelineApi from '@/lib/api/timeline'
import BasePage from "@/components/BasePage"
import Timeline from "../../components/TimelineElement"


const History = ({ timeline }) => {
    const { user, isLoading } = useUser();

    return (
        <BaseLayout user={user} isLoading={isLoading}>
            <BasePage header="Timeline">
                <Timeline timeline={timeline} />
            </BasePage>
        </BaseLayout >
    )

}

export async function getStaticProps() {
    const json = await new TimelineApi().getAll();
    const timeline = json.data;
    return {
        props: { timeline }
    }
}

export default History;