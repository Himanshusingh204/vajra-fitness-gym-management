import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { getGymMembers } from '@/api/gym';
import { ListRow, StatusPill } from '@/components/Card';
import { Field } from '@/components/Field';
import { QueryList } from '@/components/QueryList';
import { useWorkGym } from '@/hooks/useWorkGym';

// The API has no trainer-to-member assignment, so clients are the gym's members (names only), same as the web.
export default function TrainerClients() {
  const gymId = useWorkGym();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const members = useQuery({ queryKey: ['gym', gymId, 'members'], queryFn: () => getGymMembers(gymId!), enabled: !!gymId });
  const q = search.trim().toLowerCase();
  const items = members.data?.filter((m) => m.user.username.toLowerCase().includes(q));

  return (
    <QueryList
      title="Clients"
      query={members}
      items={items}
      keyExtractor={(m) => m.id}
      header={<Field label="Search" placeholder="Member name" value={search} onChangeText={setSearch} />}
      renderItem={(m) => (
        <ListRow
          title={m.user.username}
          subtitle={m.membershipPlan?.name}
          right={<StatusPill status={m.status} />}
          onPress={() => router.push({ pathname: '/clients/[id]', params: { id: m.id, name: m.user.username } })}
        />
      )}
      empty={{ title: 'No clients found', body: 'Members of your gym appear here.' }}
    />
  );
}
