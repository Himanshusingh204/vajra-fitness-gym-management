import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { getGymMembers } from '../api/gym';
import { ListRow, StatusPill } from '../components/Card';
import { Field } from '../components/Field';
import { QueryList } from '../components/QueryList';
import { useWorkGym } from '../hooks/useWorkGym';
import { useUser } from '../providers/AuthProvider';

export default function MembersScreen() {
  const gymId = useWorkGym();
  const user = useUser();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const members = useQuery({ queryKey: ['gym', gymId, 'members'], queryFn: () => getGymMembers(gymId!), enabled: !!gymId });

  // Only the gym owner may open a member's detail; staff get names only from the API.
  const canOpen = user.role === 'GYM_ADMIN';
  const q = search.trim().toLowerCase();
  const items = members.data?.filter((m) =>
    `${m.user.username} ${m.user.email ?? ''} ${m.user.phone ?? ''}`.toLowerCase().includes(q),
  );

  return (
    <QueryList
      title="Members"
      subtitle={members.data ? `${members.data.length} total` : undefined}
      query={members}
      items={items}
      keyExtractor={(m) => m.id}
      header={<Field label="Search" placeholder="Name, email or phone" value={search} onChangeText={setSearch} autoCorrect={false} />}
      renderItem={(m) => (
        <ListRow
          title={m.user.username}
          subtitle={[m.membershipPlan?.name, m.user.phone].filter(Boolean).join(', ') || undefined}
          right={<StatusPill status={m.status} />}
          onPress={canOpen ? () => router.push({ pathname: '/members/[id]', params: { id: m.id } }) : undefined}
        />
      )}
      empty={{ title: 'No members found' }}
    />
  );
}
