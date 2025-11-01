// Firebase Storage init
const storage = firebase.storage();

async function uploadAvatar(file) {
  const storageRef = storage.ref('avatars/' + file.name);
  await storageRef.put(file);
  return await storageRef.getDownloadURL();
}
document.getElementById('editorAvatarInput').addEventListener('change', async (ev)=>{
  const file = ev.target.files && ev.target.files[0];
  if(!file) return;
  document.getElementById('editorAvatarPreview').src = URL.createObjectURL(file);
  document.getElementById('saveProfile').onclick = async ()=>{
    let profile = {...await fbGetProfile()};
    profile.avatar = await uploadAvatar(file);
    // ...update field lain
    await fbSetProfile(profile); await applyProfile();
    alert('Profil & avatar diperbarui!');
    closeEditorPanel();
  }
});
