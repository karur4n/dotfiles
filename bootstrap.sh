mkdir -p ~/tmp

## Install zsh syntax highlighting
zsh_syntax_highlighting_path=${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting

if [ ! -e $zsh_syntax_highlighting_path ]; then
  git clone https://github.com/zsh-users/zsh-syntax-highlighting.git $zsh_syntax_highlighting_path
fi

## ホームディレクトリに設置する
files=()

for f in ~/dotfiles/home/.* ; do
  if [ $f = ~/dotfiles/home/. ] || [ $f = ~/dotfiles/home/.. ]; then
    continue
  fi

  files+=(${f:29}) # dotfiles/.vimrc => .vimrc
done

cd ~

for f in ${files[@]}; do
  home_path=~/$f

  if [ -e $home_path ]; then
    rm ${home_path}
  fi

  ln -s ~/dotfiles/home/$f ~/$f
done
