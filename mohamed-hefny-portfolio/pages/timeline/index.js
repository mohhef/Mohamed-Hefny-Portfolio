import BaseLayout from "@/components/layouts/BaseLayout"
import TimelineApi from '@/lib/api/timeline';
import BasePage from "@/components/BasePage"
import Timeline from "./timelineelement"


const History = ({timeline}) => {
    return (
        <BaseLayout>
            <BasePage>
                <Timeline timeline={timeline}/>
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