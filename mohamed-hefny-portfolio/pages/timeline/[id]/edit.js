
import BaseLayout from '@/components/layouts/BaseLayout';
import BasePage from '@/components/BasePage';
import withAuth from '@/hoc/withAuth';
import { useRouter } from 'next/router';
import { useGetTimeline } from '@/actions/timeline'
import TimelineForm from '@/components/TimelineForm'
import { Row, Col } from 'reactstrap'
const TimelineEdit = ({ user }) => {
  const router = useRouter();
  const { data } = useGetTimeline(router.query.id);
  return (
    <BaseLayout user={user} loading={false}>
      <BasePage header="Timeline Edit">
        <Row>
          <Col md="8">
            {data &&
              <TimelineForm 
              onSubmit={(data => alert(JSON.stringify(data)))}
              initialData={data} />
            }
          </Col>
        </Row>
      </BasePage>
    </BaseLayout>
  )
}



export default withAuth(TimelineEdit)('admin');