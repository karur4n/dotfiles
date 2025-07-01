function ghq_fzf
    set selected (ghq list | fzf --layout reverse)
    if test -n "$selected"
        cd (ghq root)/$selected
        commandline -f repaint
    end
end
