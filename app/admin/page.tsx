const handleAddDiamondsSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  playClickSound();

  if (!targetUid.trim()) {
    alert('Please enter a valid User UID');
    return;
  }

  const diamondsToAdd = Number(addDiamonds);

  if (!Number.isFinite(diamondsToAdd) || diamondsToAdd <= 0) {
    alert('Please enter a valid Red Diamond amount.');
    return;
  }

  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('id, user_uid, username, red_diamonds, lucky_spin_tokens')
    .eq('user_uid', targetUid.trim())
    .single();

  if (fetchError || !profile) {
    alert('User not found. Please check the Game UID.');
    return;
  }

  const currentDiamonds = Number(profile.red_diamonds || 0);
  const currentTokens = Number(profile.lucky_spin_tokens || 0);

  const newDiamonds = currentDiamonds + diamondsToAdd;

  // IMPORTANT:
  // Every successful deposit/top-up of 500+ Red Diamonds
  // gives EXACTLY 1 Lucky Spin Token.
  const tokenToAdd = diamondsToAdd >= 500 ? 1 : 0;
  const newTokens = currentTokens + tokenToAdd;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      red_diamonds: newDiamonds,
      lucky_spin_tokens: newTokens,
    })
    .eq('id', profile.id);

  if (updateError) {
    console.error('Top-up update error:', updateError);
    alert('Failed to update user wallet.');
    return;
  }

  alert(
    `✅ Top-up Successful!\n\n` +
    `UID: ${targetUid}\n` +
    `Red Diamonds Added: ${diamondsToAdd}\n` +
    `New Red Diamond Balance: ${newDiamonds}\n\n` +
    `🎡 Lucky Spin Token: +${tokenToAdd}\n` +
    `Total Spin Tokens: ${newTokens}`
  );

  setTargetUid('');
  setAddDiamonds('100');
};