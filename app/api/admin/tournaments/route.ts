import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabaseadmin';

export async function GET(request: Request) {
  // Owner can view tournament live board
  const auth = await verifyAdminRequest(request, 'owner');

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { data: tournaments, error: tError } = await supabaseAdmin
      .from('tournaments')
      .select(
        'id, title, type, status, start_time, end_time, entry_fee, prize_pool'
      )
      .in('type', ['day', 'week', 'mega'])
      .order('start_time', { ascending: false })
      .limit(40);

    if (tError) {
      return NextResponse.json({ error: tError.message }, { status: 500 });
    }

    const list = tournaments || [];
    const enriched = [];

    for (const t of list) {
      const { count: joinedCount } = await supabaseAdmin
        .from('tournament_participants')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', t.id);

      const { count: playedCount } = await supabaseAdmin
        .from('tournament_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', t.id)
        .in('status', ['submitted', 'validated', 'started', 'completed']);

      const { data: topAttempts } = await supabaseAdmin
        .from('tournament_attempts')
        .select('user_id, score, status')
        .eq('tournament_id', t.id)
        .in('status', ['submitted', 'validated'])
        .order('score', { ascending: false })
        .limit(10);

      const top = topAttempts || [];
      let ranks: {
        rank: number;
        user_id: string;
        score: number;
        name: string;
        uid: string;
      }[] = [];

      if (top.length > 0) {
        const ids = top.map((r) => r.user_id);
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('id, nickname, gaming_nickname, full_name')
          .in('id', ids);

        const nameMap = new Map(
          (profiles || []).map((p) => [
            p.id,
            p.nickname || p.gaming_nickname || p.full_name || 'Player',
          ])
        );

        ranks = top.map((row, idx) => {
          const uid =
            'AN-' +
            String(row.user_id).replace(/-/g, '').slice(0, 8).toUpperCase();
          return {
            rank: idx + 1,
            user_id: row.user_id,
            score: Number(row.score) || 0,
            name: nameMap.get(row.user_id) || 'Player',
            uid,
          };
        });
      }

      enriched.push({
        id: t.id,
        title: t.title,
        type: t.type,
        type_label:
          t.type === 'day'
            ? 'Daily'
            : t.type === 'week'
              ? 'Weekly'
              : 'Monthly',
        status: t.status,
        start_time: t.start_time,
        end_time: t.end_time,
        entry_fee: t.entry_fee,
        prize_pool: t.prize_pool,
        joined_count: joinedCount ?? 0,
        played_count: playedCount ?? 0,
        top_ranks: ranks,
      });
    }

    return NextResponse.json({ success: true, tournaments: enriched });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to load tournaments.' },
      { status: 500 }
    );
  }
}